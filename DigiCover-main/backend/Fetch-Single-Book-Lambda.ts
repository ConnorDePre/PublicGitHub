import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// CONSTANTS

const s3Client = new S3Client({});

// @ts-ignore
const BUCKET_NAME = process.env.BUCKET_NAME || "digicover-books";
const BOOKS_PREFIX = "books/";
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};





/*
    ----------------------------
    Fetch Single Book Lambda Function
    ----------------------------
*/





/**
 * 
 * @description Fetches a single book's details from S3 based on bookId and title path parameters.
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event containing bookId and title in path parameters.
 * 
 * @returns {Promise<APIGatewayProxyResult>} A 200 response with book details, or a 4xx/5xx error on failure.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { bookId, title } = event.pathParameters || {};

    // Validate required parameters
    if (!bookId || !title) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Missing bookId or title" }),
      };
    }

    const key = `${BOOKS_PREFIX}${bookId}-${title}.json`.toLowerCase();

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const data = await s3Client.send(new GetObjectCommand(params));
    const body = await data.Body?.transformToString();

    if (!body) {
      console.warn(`Empty body for book: ${bookId}-${title}`);
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Book not found" }),
      };
    }

    try {
      const json = JSON.parse(body);

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(json),
      };
    } catch (parseError) {
      console.error(`Failed to parse book JSON for ${key}:`, parseError);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Invalid book data format" }),
      };
    }
  } catch (error) {
    console.error("Fetch single book error:", error);

    // Distinguish between not found and server errors
    if (error instanceof Error && error.name === "NoSuchKey") {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Book not found" }),
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Server error fetching book" }),
    };
  }
};