"""
NovaSpark Technologies — Order Processor

This Lambda is triggered by SQS — NOT by API Gateway.
When messages arrive in the orders queue, Lambda receives them
as a batch of Records and this handler processes each one.

"""

import json
import logging
import os
import boto3
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------
# MODULE-LEVEL (GLOBAL) SCOPE — runs once per cold start
#
# Creating the DynamoDB resource here means it is reused across
# warm invocations instead of being recreated on every call.
# This is the same pattern as any expensive initialisation:
# boto3 clients, DB connections, config loading.
# ---------------------------------------------------------------
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])


def lambda_handler(event, context):
    records = event.get("Records", [])
    logger.info(f"Processing batch of {len(records)} order(s)")

    for record in records:
        order = json.loads(record["body"])

        order_id  = order.get("order_id", "unknown")
        item      = order.get("item", "unknown")
        quantity  = order.get("quantity", 0)
        status    = order.get("status", "received")
        created_at = order.get("created_at", "")
        customer_id = order.get("customer_id", "")

        logger.info(
            f"[ORDER RECEIVED] order_id={order_id} | item={item} | qty={quantity}"
        )

        try:
            table.put_item(
                Item={
                    "order_id": order_id,
                    "customer_id": customer_id,
                    "item": item,
                    "quantity": quantity,
                    "status": status,
                    "created_at": created_at,
                }
            )

            logger.info(f"[ORDER PERSISTED] order_id={order_id}")
        
        except Exception as e:
            logger.error(f"[ORDER FAILED] order_id={order_id} | error={e}")
            raise
    

    # Returning normally signals SQS to delete the processed messages.
    # Raising an exception causes them to reappear after the visibility timeout.
    return {"statusCode": 200, "processed": len(records)}
