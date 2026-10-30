import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as bcrypt from "bcryptjs";

// CONSTANTS

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// @ts-ignore
const USERS_TABLE = process.env.USERS_TABLE || "Users";
const BCRYPT_SALT_ROUNDS = 10;
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};





/*
    ----------------------------
    Register Lambda Function
    ----------------------------
*/





/**
 * @description - Handles user registration by validating input fields, checking for existing users, hashing the password, and storing the new user in DynamoDB.
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event containing the registration details (firstName, lastName, email, password) in the body.
 * 
 * @returns {Promise<APIGatewayProxyResult>} A 201 response on successful registration, or a 4xx/5xx error on failure.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { firstName, lastName, email, password } = body;

    // Validate all required fields
    if (!firstName || !lastName || !email || !password) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "All fields are required" }),
      };
    }

    // Validate email format
    if (!validateEmail(email)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Invalid email format" }),
      };
    }

    // Check if user already exists
    const checkParams = {
      TableName: USERS_TABLE,
      Key: { username: email },
    };
    const { Item } = await docClient.send(new GetCommand(checkParams));

    if (Item) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "User already exists" }),
      };
    }

    // Hash password and create new user
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const putParams = {
      TableName: USERS_TABLE,
      Item: {
        username: email,
        firstName,
        lastName,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      },
    };

    await docClient.send(new PutCommand(putParams));

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "User created successfully!" }),
    };
  } catch (error) {
    console.error("Registration Error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Server error during registration" }),
    };
  }
};