import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = process.env.BUCKET_NAME || "digicover-books";
const BOOKS_PREFIX = process.env.BOOKS_PREFIX || "books/";
const USER_ACTIVITY_TABLE = process.env.USER_ACTIVITY_TABLE || "UserActivity";
const PREFERENCE_LOOKBACK_DAYS = Number(process.env.PREFERENCE_LOOKBACK_DAYS || 14);
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const WEIGHTS = {
  LIKE: 2,
  SHARE: 3,
  SAVE: 2,
  AUTHOR_PREFERENCE: 3,
  TAG_PREFERENCE: 1.5,
  RECENCY_LAMBDA: 0.06,
} as const;

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

type ActivityEvent = {
  author?: string;
  tags?: string[];
};

type BookRecord = {
  bookId: string;
  metadata?: {
    title?: string;
    author?: {
      name?: string;
    };
    coverImage?: string;
    publishedDate?: string;
  };
  social?: {
    likes?: number;
    shares?: number;
    saves?: number;
    tags?: string[];
  };
};

type RankedBook = {
  bookId: string;
  title: string;
  author: string;
  coverImage: string;
  likes: number;
  score: number;
};

const getRequestUsername = (event: APIGatewayProxyEvent): string | null => {
  const userFromQuery = event.queryStringParameters?.username;
  const userFromHeader = event.headers["x-user-id"] || event.headers["X-User-Id"];
  const username = userFromQuery || userFromHeader;

  if (!username || !username.trim()) {
    return null;
  }

  return username.trim().toLowerCase();
};

const getLimit = (event: APIGatewayProxyEvent): number => {
  const raw = Number(event.queryStringParameters?.limit || DEFAULT_LIMIT);

  if (Number.isNaN(raw) || raw <= 0) return DEFAULT_LIMIT;
  if (raw > MAX_LIMIT) return MAX_LIMIT;
  return Math.floor(raw);
};

const getLookbackIso = () => {
  const now = Date.now();
  const lookbackMs = PREFERENCE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  return new Date(now - lookbackMs).toISOString();
};

const readUserPreferences = async (username: string) => {
  const authorCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  const params = {
    TableName: USER_ACTIVITY_TABLE,
    KeyConditionExpression: "pk = :pk AND sk >= :start",
    ExpressionAttributeValues: {
      ":pk": `USER#${username}`,
      ":start": `TS#${getLookbackIso()}`,
    },
  };

  const result = await docClient.send(new QueryCommand(params));
  const items = (result.Items || []) as ActivityEvent[];

  for (const item of items) {
    const author = item.author?.trim().toLowerCase();
    if (author) {
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    }

    if (Array.isArray(item.tags)) {
      for (const rawTag of item.tags) {
        const tag = rawTag?.trim().toLowerCase();
        if (!tag) continue;
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  return { authorCounts, tagCounts };
};

const loadBooksFromS3 = async (): Promise<BookRecord[]> => {
  const list = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: BOOKS_PREFIX,
    }),
  );

  if (!list.Contents?.length) {
    return [];
  }

  const books: BookRecord[] = [];
  for (const object of list.Contents) {
    if (!object.Key || object.Key === BOOKS_PREFIX || !object.Key.endsWith(".json")) continue;

    const data = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: object.Key,
      }),
    );

    const body = await data.Body?.transformToString();
    if (!body) continue;

    try {
      books.push(JSON.parse(body) as BookRecord);
    } catch (error) {
      console.warn(`Skipping invalid book JSON at ${object.Key}:`, error);
    }
  }

  return books;
};

const getRecencyPenalty = (publishedDate?: string): number => {
  if (!publishedDate) return 1;
  const publishedAt = new Date(publishedDate).getTime();
  if (Number.isNaN(publishedAt)) return 1;

  const ageHours = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60));
  return Math.exp(-WEIGHTS.RECENCY_LAMBDA * ageHours);
};

const scoreBook = (
  book: BookRecord,
  authorCounts: Record<string, number>,
  tagCounts: Record<string, number>,
): RankedBook => {
  const likes = Number(book.social?.likes || 0);
  const shares = Number(book.social?.shares || 0);
  const saves = Number(book.social?.saves || 0);

  const engagementScore = likes * WEIGHTS.LIKE + shares * WEIGHTS.SHARE + saves * WEIGHTS.SAVE;
  const recencyPenalty = getRecencyPenalty(book.metadata?.publishedDate);

  const authorName = book.metadata?.author?.name || "Unknown Author";
  const normalizedAuthor = authorName.toLowerCase();
  const authorBoost = (authorCounts[normalizedAuthor] || 0) * WEIGHTS.AUTHOR_PREFERENCE;

  const tags = Array.isArray(book.social?.tags) ? book.social?.tags : [];
  let tagBoost = 0;
  for (const tag of tags) {
    tagBoost += (tagCounts[tag.toLowerCase()] || 0) * WEIGHTS.TAG_PREFERENCE;
  }

  const score = engagementScore * recencyPenalty + authorBoost + tagBoost;

  return {
    bookId: book.bookId,
    title: book.metadata?.title || "Untitled Book",
    author: authorName,
    coverImage: book.metadata?.coverImage || "",
    likes,
    score: Number(score.toFixed(4)),
  };
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const username = getRequestUsername(event);
    if (!username) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "username query parameter (or x-user-id header) is required" }),
      };
    }

    const limit = getLimit(event);
    const [books, preferences] = await Promise.all([loadBooksFromS3(), readUserPreferences(username)]);

    const rankedBooks = books
      .filter((book) => Boolean(book.bookId))
      .map((book) => scoreBook(book, preferences.authorCounts, preferences.tagCounts))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(rankedBooks),
    };
  } catch (error) {
    console.error("For You feed error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Server error generating For You feed" }),
    };
  }
};
