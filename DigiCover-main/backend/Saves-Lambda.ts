import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

// CONSTANTS

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// @ts-ignore
const BUCKET_NAME = process.env.BUCKET_NAME || "digicover-books";
// @ts-ignore
const BOOKS_PREFIX = process.env.BOOKS_PREFIX || "books/";
// @ts-ignore
const USER_ACTIVITY_TABLE = process.env.USER_ACTIVITY_TABLE || "UserActivity";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

// TYPES

type SaveTogglePayload = {
  username?: string;
  save?: boolean;
  title?: string;
  author?: string;
  coverImage?: string;
  tags?: string[];
};

// HELPERS

const jsonResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

const parseBody = <T,>(event: APIGatewayProxyEvent): T => {
  if (!event.body) return {} as T;
  try {
    return JSON.parse(event.body) as T;
  } catch {
    return {} as T;
  }
};

/**
 * Resolve the S3 key for a book. Saves don't mutate S3, but we still verify
 * the book exists so we can return a clean 404 instead of silently saving a
 * dangling reference.
 */
const resolveBookKey = async (bookId: string, title?: string): Promise<string | null> => {
  if (title) {
    const canonical = `${BOOKS_PREFIX}${bookId}-${title.toLowerCase().replace(/ /g, "-")}.json`;
    try {
      await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: canonical }));
      return canonical;
    } catch {
      // fall through to listing
    }
  }

  const listed = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${BOOKS_PREFIX}${bookId}-`,
    }),
  );

  const match = listed.Contents?.find((obj) => obj.Key && obj.Key.endsWith(".json"));
  return match?.Key || null;
};

// SUB-HANDLERS

const handleToggleSave = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bookId = event.pathParameters?.bookId?.trim();
  const payload = parseBody<SaveTogglePayload>(event);
  const { username, save, title, author, coverImage, tags } = payload;

  if (!username || !bookId || typeof save !== "boolean") {
    return jsonResponse(400, {
      message: "username, bookId, and save (boolean) are required",
    });
  }

  const normalizedUsername = String(username).toLowerCase();
  const pk = `USER#${normalizedUsername}`;
  const sk = `SAVE#${bookId}`;

  try {
    const key = await resolveBookKey(bookId, title);
    if (!key) {
      return jsonResponse(404, { message: "Book not found" });
    }

    if (save) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: USER_ACTIVITY_TABLE,
            Item: {
              pk,
              sk,
              username: normalizedUsername,
              bookId,
              eventType: "save",
              title: title || "",
              author: author || "",
              coverImage: coverImage || "",
              tags: Array.isArray(tags) ? tags : [],
              createdAt: new Date().toISOString(),
            },
            ConditionExpression: "attribute_not_exists(pk)",
          }),
        );

        return jsonResponse(200, { saved: true });
      } catch (error: any) {
        if (error?.name === "ConditionalCheckFailedException") {
          return jsonResponse(200, { saved: true });
        }
        throw error;
      }
    } else {
      const existing = await docClient.send(
        new GetCommand({
          TableName: USER_ACTIVITY_TABLE,
          Key: { pk, sk },
        }),
      );

      if (!existing.Item) {
        return jsonResponse(200, { saved: false });
      }

      await docClient.send(
        new DeleteCommand({
          TableName: USER_ACTIVITY_TABLE,
          Key: { pk, sk },
        }),
      );

      return jsonResponse(200, { saved: false });
    }
  } catch (error) {
    console.error("Save error:", error);
    return jsonResponse(500, { message: "Failed to update save" });
  }
};

const handleSaveStatus = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bookId = event.pathParameters?.bookId?.trim();
  const username = event.queryStringParameters?.username?.trim().toLowerCase();

  if (!username || !bookId) {
    console.warn("Save status bad request", { username, bookId });
    return jsonResponse(400, { message: "username and bookId are required" });
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USER_ACTIVITY_TABLE,
        Key: { pk: `USER#${username}`, sk: `SAVE#${bookId}` },
      }),
    );

    return jsonResponse(200, { saved: !!result.Item });
  } catch (error) {
    console.error("Save status error:", error);
    return jsonResponse(500, { message: "Failed to fetch save status" });
  }
};

const handleUserSaves = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const rawUsername = event.pathParameters?.username || "";
  const username = decodeURIComponent(rawUsername).trim().toLowerCase();

  if (!username) {
    return jsonResponse(400, { message: "username is required" });
  }

  console.log(`Querying user library for partition key: USER#${username}`);

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: USER_ACTIVITY_TABLE,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${username}`,
          ":prefix": "SAVE#",
        },
      }),
    );

    const savedBooks = (result.Items || []).map((item) => ({
      bookId: item.bookId ? String(item.bookId) : "",
      title: item.title ? String(item.title) : "Untitled Book",
      author: item.author ? String(item.author) : "Unknown Author",
      coverImage: item.coverImage ? String(item.coverImage) : "",
      savedAt: item.createdAt || item.savedAt || new Date().toISOString(),
    }));

    return jsonResponse(200, savedBooks.filter(b => b.bookId));
  } catch (error) {
    console.error("Fetch user saves error:", error);
    return jsonResponse(500, { message: "Failed to fetch saved books" });
  }
};


/*
    ----------------------------
    Saves Lambda Function
    ----------------------------
*/

/**
 * @description Handles save (Personal Library) routes:
 *   - POST  /books/{bookId}/save         -> toggle save (body { username, save, title?, author?, coverImage?, tags? })
 *   - GET   /books/{bookId}/save-status  -> { saved: boolean }
 *   - GET   /users/{username}/saves      -> saved books array
 *
 * @param {APIGatewayProxyEvent} event - API Gateway event; dispatched on `${httpMethod} ${resource}`.
 *
 * @returns {Promise<APIGatewayProxyResult>}
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const route = `${event.httpMethod} ${event.resource}`;
  switch (route) {
    case "POST /books/{bookId}/save": return handleToggleSave(event);
    case "GET /books/{bookId}/save-status": return handleSaveStatus(event);
    case "GET /users/{username}/saves": return handleUserSaves(event);
    default: return jsonResponse(404, { message: "Route not found" });
  }
};