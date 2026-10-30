import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// CONSTANTS

const s3Client = new S3Client({});

// @ts-ignore
const BUCKET_NAME = process.env.BUCKET_NAME || "digicover-books";
const BOOKS_PREFIX = "books/";
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

// Default values for book metadata
const DEFAULTS = {
  AUTHOR_BIO: "N/A",
  AUTHOR_ID: "author-002",
  GENRE: "Demo",
  COVER_IMAGE: "/assets/images/default-book.png",
};

interface AuthorMetadata {
  name: string;
  bio: string;
  id: string;
}

interface BookMetadata {
  bookId: string;
  metadata: {
    title: string;
    author: AuthorMetadata;
    genre: string;
    publishedDate: string;
    coverImage: string;
    description: string;
  };
  content: {
    totalPages: number;
    pages: unknown[];
  };
  social: {
    shares: number;
    likes: number;
    tags: string[];
  };
}

const validatePublishPayload = (data: any): string | null => {
  if (!data.bookId) return "Missing required field: bookId";
  if (!data.title) return "Missing required field: title";
  if (!data.author) return "Missing required field: author";
  if (!Array.isArray(data.pages) || data.pages.length === 0) return "Missing required field: pages (must be non-empty array)";
  return null;
};

const structureBookData = (payload: APIGatewayProxyEvent): { bookData: BookMetadata; fileName: string } => {
  const { bookId, title, author, pages, description, social, genre } = JSON.parse(payload.body?.toString() || "{}");

  const bookData: BookMetadata = {
    bookId,
    metadata: {
      title,
      author: {
        name: author,
        bio: DEFAULTS.AUTHOR_BIO,
        id: DEFAULTS.AUTHOR_ID,
      },
      genre: (typeof genre === 'string' && genre.trim()) ? genre.trim() : "Other",
      publishedDate: new Date().toISOString(),
      coverImage: DEFAULTS.COVER_IMAGE,
      description,
    },
    content: {
      totalPages: pages.length,
      pages,
    },
    social: social || { shares: 0, likes: 0, tags: [] },
  };

  const fileName = `${bookId}-${title.toLowerCase().replace(/ /g, "-")}.json`;

  return { bookData, fileName };
};

const sanitizeFileNamePart = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, "-");




/*
    ----------------------------
    Publish Lambda Function
    ----------------------------
*/





/**
 * @description Handles the publishing of book metadata and content to AWS S3.
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event containing the book payload in the body.
 * 
 * @returns {Promise<APIGatewayProxyResult>} A 200 response with the file URL on success, or a 4xx/5xx error.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Request body is missing" }),
      };
    }

    let payload: any;
    try {
      payload = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Invalid JSON in request body" }),
      };
    }

    // Validate required fields
    const validationError = validatePublishPayload(payload);
    if (validationError) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: validationError }),
      };
    }

    const { bookData } = structureBookData(event);
    const fileName = `${bookData.bookId}-${sanitizeFileNamePart(bookData.metadata.title)}.json`;

    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: `${BOOKS_PREFIX}${fileName}`,
      Body: JSON.stringify(bookData),
      ContentType: "application/json",
    };

    await s3Client.send(new PutObjectCommand(s3Params));

    console.log(`Book published successfully: ${fileName}`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Published successfully!", url: fileName }),
    };
  } catch (error) {
    console.error("Publish error:", error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Server error during publish" }),
    };
  }
};
