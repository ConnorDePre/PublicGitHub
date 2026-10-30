import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as bcrypt from "bcryptjs";

// CONSTANTS

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// @ts-ignore
const USERS_TABLE = process.env.USERS_TABLE || "Users";
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
};





/*
    ----------------------------
    Login Lambda Function
    ----------------------------
*/





/**
 * @description Handles user login by validating email and password against stored credentials in DynamoDB.
 * 
 * @param {APIGatewayProxyEvent} event - The API Gateway event containing the email and password in the body for authentication.
 * 
 * @returns {Promise<APIGatewayProxyResult>} A 200 response with user info on successful login, or a 4xx/5xx error on failure.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Email and password are required" }),
      };
    }

    // Retrieve user from database
    const params = {
      TableName: USERS_TABLE,
      Key: { username: email },
    };

    const { Item } = await docClient.send(new GetCommand(params));

    if (!Item) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, Item.password);

    if (!isPasswordValid) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Wrong password" }),
      };
    }

    console.log(`User logged in successfully: ${email}`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Success",
        user: {
          username: Item.username,
          firstName: Item.firstName || "",
          lastName: Item.lastName || "",
        },
      }),
    };
  } catch (error) {
    console.error("Login Error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Server error during login" }),
    };
  }
};