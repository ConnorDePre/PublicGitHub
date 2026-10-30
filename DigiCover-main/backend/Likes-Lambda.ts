import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
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

type LikeTogglePayload = {
  username?: string;
  like?: boolean;
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
 * Resolve the S3 key for a book. Prefer the canonical "${bookId}-${title}.json"
 * format used by Publish; fall back to ListObjectsV2 by bookId prefix when title is missing.
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

/**
 * Read-modify-write the book JSON in S3 to adjust social.likes by delta.
 * Not atomic; concurrent likes from different users could undercount by 1
 * in rare cases, which is acceptable at current scale.
 */
const adjustBookLikes = async (key: string, delta: number): Promise<{ likes: number }> => {
  const current = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  const body = await current.Body?.transformToString();
  if (!body) throw new Error(`Empty body for book key ${key}`);

  const json = JSON.parse(body);
  const existing = Number(json.social?.likes || 0);
  const nextLikes = Math.max(0, existing + delta);

  json.social = {
    ...(json.social || { shares: 0, likes: 0, tags: [] }),
    likes: nextLikes,
  };

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(json),
      ContentType: "application/json",
    }),
  );

  return { likes: nextLikes };
};

const readLikesFromS3 = async (key: string): Promise<number> => {
  const current = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  const body = await current.Body?.transformToString();
  if (!body) return 0;
  const json = JSON.parse(body);
  return Number(json.social?.likes || 0);
};

// SUB-HANDLERS

const handleToggleLike = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bookId = event.pathParameters?.bookId?.trim();
  const payload = parseBody<LikeTogglePayload>(event);
  const { username, like, title, author, coverImage, tags } = payload;

  if (!username || !bookId || typeof like !== "boolean") {
    return jsonResponse(400, {
      message: "username, bookId, and like (boolean) are required",
    });
  }

  const normalizedUsername = String(username).toLowerCase();
  const pk = `USER#${normalizedUsername}`;
  const sk = `LIKE#${bookId}`;

  try {
    const key = await resolveBookKey(bookId, title);
    if (!key) {
      return jsonResponse(404, { message: "Book not found" });
    }

    if (like) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: USER_ACTIVITY_TABLE,
            Item: {
              pk,
              sk,
              username: normalizedUsername,
              bookId,
              eventType: "like",
              title: title || "",
              author: author || "",
              coverImage: coverImage || "",
              tags: Array.isArray(tags) ? tags : [],
              createdAt: new Date().toISOString(),
            },
            ConditionExpression: "attribute_not_exists(pk)",
          }),
        );

        const { likes } = await adjustBookLikes(key, +1);
        return jsonResponse(200, { liked: true, likes });
      } catch (error: any) {
        if (error?.name === "ConditionalCheckFailedException") {
          const likes = await readLikesFromS3(key);
          return jsonResponse(200, { liked: true, likes });
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
        const likes = await readLikesFromS3(key);
        return jsonResponse(200, { liked: false, likes });
      }

      await docClient.send(
        new DeleteCommand({
          TableName: USER_ACTIVITY_TABLE,
          Key: { pk, sk },
        }),
      );

      const { likes } = await adjustBookLikes(key, -1);
      return jsonResponse(200, { liked: false, likes });
    }
  } catch (error) {
    console.error("Like error:", error);
    return jsonResponse(500, { message: "Failed to update like" });
  }
};

const handleLikeStatus = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bookId = event.pathParameters?.bookId?.trim();
  const username = event.queryStringParameters?.username?.trim().toLowerCase();

  if (!username || !bookId) {
    console.warn("Like status bad request", { username, bookId });
    return jsonResponse(400, { message: "username and bookId are required" });
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: USER_ACTIVITY_TABLE,
        Key: { pk: `USER#${username}`, sk: `LIKE#${bookId}` },
      }),
    );

    return jsonResponse(200, { liked: !!result.Item });
  } catch (error) {
    console.error("Like status error:", error);
    return jsonResponse(500, { message: "Failed to fetch like status" });
  }
};

const handleUserLikes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const rawUsername = event.pathParameters?.username || "";
  const username = decodeURIComponent(rawUsername).trim().toLowerCase();

  if (!username) {
    return jsonResponse(400, { message: "username is required" });
  }

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: USER_ACTIVITY_TABLE,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${username}`,
          ":prefix": "LIKE#",
        },
      }),
    );

    const likedBooks = (result.Items || []).map((item) => ({
      bookId: item.bookId ? String(item.bookId) : "",
      title: item.title ? String(item.title) : "Untitled Book",
      author: item.author ? String(item.author) : "Unknown Author",
      coverImage: item.coverImage ? String(item.coverImage) : "",
      likes: 0,
      likedAt: item.createdAt || item.savedAt || new Date().toISOString(),
    }));

    return jsonResponse(200, likedBooks.filter(b => b.bookId));
  } catch (error) {
    console.error("Fetch user likes error:", error);
    return jsonResponse(500, { message: "Failed to fetch liked books" });
  }
};

/*
    ----------------------------
    Likes Lambda Function
    ----------------------------
*/

/**
 * @description Handles like-related routes:
 *   - POST  /books/{bookId}/like         -> toggle like (body { username, like, title?, author?, coverImage?, tags? })
 *   - GET   /books/{bookId}/like-status  -> { liked: boolean }
 *   - GET   /users/{username}/likes      -> liked books array
 *
 * @param {APIGatewayProxyEvent} event - API Gateway event; dispatched on `${httpMethod} ${resource}`.
 *
 * @returns {Promise<APIGatewayProxyResult>}
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const route = `${event.httpMethod} ${event.resource}`;
  switch (route) {
    case "POST /books/{bookId}/like": return handleToggleLike(event);
    case "GET /books/{bookId}/like-status": return handleLikeStatus(event);
    case "GET /users/{username}/likes": return handleUserLikes(event);
    default: return jsonResponse(404, { message: "Route not found" });
  }
};