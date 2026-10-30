import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

// CONSTANTS

const s3Client = new S3Client({});

// @ts-ignore
const BUCKET_NAME = process.env.BUCKET_NAME || "digicover-books";
// @ts-ignore
const BOOKS_PREFIX = process.env.BOOKS_PREFIX || "books/";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

// TYPES

type BookRecord = {
  bookId?: string;
  metadata?: {
    title?: string;
    author?: { name?: string };
    coverImage?: string;
    description?: string;
    genre?: string;
  };
  social?: {
    likes?: number;
  };
};

type SearchResult = {
  bookId: string;
  title: string;
  author: string;
  coverImage: string;
  likes: number;
  genre: string;
};

// HELPERS

const jsonResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

const fetchAllBooks = async (): Promise<BookRecord[]> => {
  const listed = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: BOOKS_PREFIX,
    }),
  );

  if (!listed.Contents?.length) return [];

  const books: BookRecord[] = [];
  for (const file of listed.Contents) {
    if (!file.Key || file.Key === BOOKS_PREFIX || !file.Key.endsWith(".json")) continue;

    try {
      const data = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.Key,
        }),
      );

      const body = await data.Body?.transformToString();
      if (!body) continue;

      books.push(JSON.parse(body) as BookRecord);
    } catch (error) {
      console.warn(`Skipping invalid book at ${file.Key}:`, error);
    }
  }

  return books;
};

/*
    ----------------------------
    Search Books Lambda Function
    ----------------------------
*/

/**
 * @description Searches the books bucket by free-text query and/or genre.
 *   - GET /books/search?q=&genre=
 *   - q: case-insensitive substring match across title, author name, description.
 *   - genre: case-insensitive equality on metadata.genre; "all" (or missing) means no filter.
 *   - Returns alphabetized array of { bookId, title, author, coverImage, likes, genre }.
 *
 * @param {APIGatewayProxyEvent} event - API Gateway event with optional q and genre query params.
 *
 * @returns {Promise<APIGatewayProxyResult>}
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const q = (event.queryStringParameters?.q || "").trim().toLowerCase();
  const genreParam = (event.queryStringParameters?.genre || "").trim();
  const genreFilter =
    genreParam && genreParam.toLowerCase() !== "all" ? genreParam.toLowerCase() : null;

  try {
    const rawBooks = await fetchAllBooks();

    const results: SearchResult[] = rawBooks
      .filter((book) => Boolean(book.bookId))
      .filter((book) => {
        if (!genreFilter) return true;
        const g = (book.metadata?.genre || "").toLowerCase();
        return g === genreFilter;
      })
      .filter((book) => {
        if (!q) return true;
        const title = (book.metadata?.title || "").toLowerCase();
        const author = (book.metadata?.author?.name || "").toLowerCase();
        const description = (book.metadata?.description || "").toLowerCase();
        return title.includes(q) || author.includes(q) || description.includes(q);
      })
      .map((book) => ({
        bookId: book.bookId as string,
        title: book.metadata?.title || "Untitled Book",
        author: book.metadata?.author?.name || "Unknown Author",
        coverImage: book.metadata?.coverImage || "",
        likes: Number(book.social?.likes || 0),
        genre: book.metadata?.genre || "Other",
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return jsonResponse(200, results);
  } catch (error) {
    console.error("Search books error:", error);
    return jsonResponse(500, { message: "Failed to search books" });
  }
};
