import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USER_ACTIVITY_TABLE = process.env.USER_ACTIVITY_TABLE || "UserActivity";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

type AllowedEvent = "view" | "like";
const ALLOWED_EVENTS: AllowedEvent[] = ["view", "like"];

type ActivityPayload = {
  username?: string;
  bookId?: string;
  eventType?: string;
  author?: string;
  tags?: string[];
};

const parseBody = (event: APIGatewayProxyEvent): ActivityPayload => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const getValidationError = (payload: ActivityPayload): string | null => {
  if (!payload.username?.trim()) return "username is required";
  if (!payload.bookId?.trim()) return "bookId is required";
  if (!payload.eventType?.trim()) return "eventType is required";
  if (!ALLOWED_EVENTS.includes(payload.eventType as AllowedEvent)) {
    return "eventType must be one of: view, like";
  }
  return null;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const payload = parseBody(event);
    const error = getValidationError(payload);
    if (error) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: error }),
      };
    }

    const username = payload.username!.trim().toLowerCase();
    const bookId = payload.bookId!.trim();
    const eventType = payload.eventType as AllowedEvent;
    const createdAt = new Date().toISOString();
    const normalizedTags = Array.isArray(payload.tags)
      ? payload.tags.map((tag) => tag.trim()).filter(Boolean)
      : [];

    const item = {
      pk: `USER#${username}`,
      sk: `TS#${createdAt}#BOOK#${bookId}#${eventType}`,
      username,
      bookId,
      eventType,
      author: payload.author || "",
      tags: normalizedTags,
      createdAt,
    };

    await docClient.send(
      new PutCommand({
        TableName: USER_ACTIVITY_TABLE,
        Item: item,
      }),
    );

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Recorded" }),
    };
  } catch (error) {
    console.error("Record activity error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Server error recording activity" }),
    };
  }
};
