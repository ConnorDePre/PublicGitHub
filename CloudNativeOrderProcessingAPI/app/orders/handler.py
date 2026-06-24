"""
NovaSpark Technologies — Order API

This Lambda handles all five Order API routes via routeKey dispatching.
"""

import json
import logging
import os
import uuid
import datetime
import decimal
import boto3
from boto3.dynamodb.conditions import Attr


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------
# MODULE-LEVEL (GLOBAL) SCOPE — runs once per cold start
#
# Both the SQS client (for POST) and the DynamoDB table (for GET)
# are initialised here so they are reused on warm invocations.
# ---------------------------------------------------------------
sqs    = boto3.client("sqs")
dynamodb = boto3.resource("dynamodb")
table  = dynamodb.Table(os.environ["TABLE_NAME"])


def lambda_handler(event, context):
    logger.info(f"Event received: {json.dumps(event)}")
    route_key = event.get("routeKey", "")

    if route_key == "POST /orders":
        return handle_post_order(event)
    elif route_key == "GET /orders/{id}":
        return handle_get_order_by_id(event)
    elif route_key == "GET /orders":
        return handle_list_orders(event)
    elif route_key == "PATCH /orders/{id}":
        return handle_patch_order(event)
    elif route_key == "DELETE /orders/{id}":
        return handle_delete_order(event)
    else:
        return {
            "statusCode": 404,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": f"Route not found: {route_key}"}),
        }


# ---------------------------------------------------------------
# POST /orders
# ---------------------------------------------------------------

def handle_post_order(event):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _error(400, "Request body must be valid JSON")

    item     = body.get("item")
    quantity = body.get("quantity")

    if not item or quantity is None:
        return _error(400, "Both 'item' and 'quantity' are required fields")

    if not isinstance(quantity, int) or quantity < 1:
        return _error(400, "'quantity' must be a positive integer")
    
    customer_id = body.get("customer_id")

    if not customer_id:
        return _error(400, "customer_id is required")

    order = {
        "order_id":   str(uuid.uuid4()),
        "customer_id": customer_id,
        "item":       item,
        "quantity":   quantity,
        "status":     "received",
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    }

    queue_url = os.environ["QUEUE_URL"]
    sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(order))
    logger.info(f"Order queued: {order['order_id']}")

    return {
        "statusCode": 202,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "order_id": order["order_id"],
            "status":   "received",
            "message":  "Order accepted and queued for processing",
        }),
    }


# ---------------------------------------------------------------
# GET /orders/{id}
# ---------------------------------------------------------------

def handle_get_order_by_id(event):
    # Retrieve a single order by order_id from DynamoDB.
    #
    try:
        order_id = event["pathParameters"]["id"]

        response = table.get_item(Key={"order_id": order_id})
        order = response.get("Item")

        if not order:
            return _error(404, f"Order {order_id} not found")
        
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(order, cls=DecimalEncoder),
        }
    
    except Exception as e:
        logger.error(f"[GET ORDER FAILED] order_id={order_id} | error={e}")
        return _error(500, "Internal server error")




    


# ---------------------------------------------------------------
# GET /orders
# ---------------------------------------------------------------

def handle_list_orders(event):
    # List orders from DynamoDB, with an optional status filter.
    #
    # Note on scan(): scan() reads every item in the table and is perfectly
    # fine for small tables like this one. In a production system with
    # millions of orders you would use a GSI and query() instead.
    try:
        params = event.get("queryStringParameters") or {}
        status_filter = params.get("status")
        customer_filter = params.get("customer_id")

        if status_filter and customer_filter:
            response = table.scan(
                FilterExpression=
                    Attr("status").eq(status_filter) &
                    Attr("customer_id").eq(customer_filter)
            )
        elif customer_filter:
            response = table.scan(
                FilterExpression=Attr("customer_id").eq(customer_filter)
            )
        elif status_filter:
            response = table.scan(
                FilterExpression=Attr("status").eq(status_filter)
            )
        else:
            response = table.scan()

        orders = response.get("Items", [])

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(
                {"orders": orders, "count": len(orders)},
                cls=DecimalEncoder
            ),
        }
    except Exception as e:
        logger.error(f"[LIST ORDERS FAILED] error={e}")
        return _error(500, "Internal server error")


# ---------------------------------------------------------------
# PATCH /orders/{id} — stub (Lab extension)
# ---------------------------------------------------------------

def handle_patch_order(event):
    # Extension work — update order status (e.g. received → processing → shipped)
    # Requires a table.update_item() call with an UpdateExpression.
    # See project roadmap for the extension specification.
    return _not_implemented("PATCH /orders/{id}")


# ---------------------------------------------------------------
# DELETE /orders/{id} — stub (Lab extension)
# ---------------------------------------------------------------

def handle_delete_order(event):
    # Extension work — soft-delete by setting status = "cancelled"
    # rather than removing the item from the table.
    # See project roadmap for the extension specification.
    return _not_implemented("DELETE /orders/{id}")


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------

def _error(status_code, message):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": message}),
    }


def _not_implemented(route):
    return {
        "statusCode": 501,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "error": "Not implemented",
            "route": route,
            "hint": "This route is a Lab 6 TODO — see handler.py for instructions",
        }),
    }
