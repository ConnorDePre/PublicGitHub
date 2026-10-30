import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

// CONSTANTS

const s3Client = new S3Client({});

// @ts-ignore
const BUCKET_NAME = process.env.BUCKET_NAME || "digicover-books";
const BOOKS_PREFIX = "books/";
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

interface BookMetadata {
  bookId: string;
  title: string;
  author: string;
  coverImage: string;
  likes: number;
}

const extractBookMetadata = (json: any): BookMetadata | null => {
  try {
    return {
      bookId: json.bookId,
      title: json.metadata?.title,
      author: json.metadata?.author?.name,
      coverImage: json.metadata?.coverImage,
      likes: json.social?.likes || 0,
    };
  } catch (error) {
    console.warn(`Failed to extract metadata from book:`, error);
    return null;
  }
};





/*
    ----------------------------
    Fetch Books Lambda Function
    ----------------------------
*/





/**
 *
 * @description Fetches a list of all books from S3, extracting metadata for each book to return a summary list.
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event triggering the fetch operation.
 * 
 * @returns {Promise<APIGatewayProxyResult>} A 200 response with an array of book summaries, or a 500 error if fetching fails.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: BOOKS_PREFIX,
    };

    const listed = await s3Client.send(new ListObjectsV2Command(listParams));

    if (!listed.Contents || listed.Contents.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      };
    }

    const books: BookMetadata[] = [];

    for (const file of listed.Contents) {
      // Skip non-JSON files and the prefix itself
      if (!file.Key || file.Key === BOOKS_PREFIX || !file.Key.endsWith(".json")) {
        continue;
      }

      try {
        const getParams = {
          Bucket: BUCKET_NAME,
          Key: file.Key,
        };

        const data = await s3Client.send(new GetObjectCommand(getParams));
        const body = await data?.Body?.transformToString();

        if (!body) {
          console.warn(`Empty body for file: ${file.Key}`);
          continue;
        }

        const json = JSON.parse(body);
        const metadata = extractBookMetadata(json);

        if (metadata) {
          books.push(metadata);
        }
      } catch (error) {
        console.error(`Failed to process book file ${file.Key}:`, error);
        // Continue processing other books on error
        continue;
      }
    }

    console.log(`Successfully fetched ${books.length} books`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(books),
    };
  } catch (error) {
    console.error("Fetch books error:", error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Failed to fetch books" }),
    };
  }
};