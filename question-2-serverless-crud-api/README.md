# Serverless CRUD API

A production-ready REST API built with AWS Lambda, API Gateway, and DynamoDB for managing items with full CRUD operations.

## Architecture

- **AWS Lambda**: Serverless compute for handling API requests
- **API Gateway**: RESTful API endpoints
- **DynamoDB**: NoSQL database for data persistence
- **Serverless Framework**: Infrastructure as Code (IaC)

## Prerequisites

- Node.js 18.x or higher
- AWS CLI configured with appropriate credentials
- Serverless Framework CLI (`npm install -g serverless`)

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Configure AWS credentials:
```bash
aws configure
```

## Deployment

Deploy to AWS:
```bash
# Deploy to dev environment
npm run deploy

# Deploy to production
serverless deploy --stage prod
```

The deployment will output API Gateway endpoints:
```
endpoints:
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/items
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/items/{itemId}
  PUT - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/items/{itemId}
  DELETE - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/items/{itemId}
```

## API Endpoints

### Create Item
**POST** `/items`

Request body:
```json
{
  "name": "Sample Item",
  "description": "This is a sample item description"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "itemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Sample Item",
    "description": "This is a sample item description",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "version": 1
  }
}
```

### Get Item
**GET** `/items/{itemId}`

Response (200):
```json
{
  "success": true,
  "data": {
    "itemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Sample Item",
    "description": "This is a sample item description",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "version": 1
  }
}
```

Error (404):
```json
{
  "success": false,
  "error": {
    "message": "Item not found"
  }
}
```

### Update Item
**PUT** `/items/{itemId}`

Request body:
```json
{
  "name": "Updated Item Name",
  "description": "Updated description"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "itemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Updated Item Name",
    "description": "Updated description",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:35:00.000Z",
    "version": 2
  }
}
```

### Delete Item
**DELETE** `/items/{itemId}`

Response (200):
```json
{
  "success": true,
  "data": {
    "message": "Item deleted successfully",
    "deletedItem": {
      "itemId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Updated Item Name",
      "description": "Updated description"
    }
  }
}
```

## Testing the API

### Using cURL

Create an item:
```bash
curl -X POST https://YOUR_API_ENDPOINT/dev/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Item",
    "description": "Testing the API"
  }'
```

Get an item:
```bash
curl https://YOUR_API_ENDPOINT/dev/items/ITEM_ID
```

Update an item:
```bash
curl -X PUT https://YOUR_API_ENDPOINT/dev/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "description": "Updated description"
  }'
```

Delete an item:
```bash
curl -X DELETE https://YOUR_API_ENDPOINT/dev/items/ITEM_ID
```

### Using Postman

1. Import the API endpoints into Postman
2. Set the base URL to your API Gateway endpoint
3. Test each operation with appropriate request bodies

## Error Handling

The API implements comprehensive error handling:

- **400 Bad Request**: Invalid input data or malformed JSON
- **404 Not Found**: Item does not exist
- **409 Conflict**: Item already exists (on creation)
- **500 Internal Server Error**: Unexpected server errors

All errors return a consistent format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": ["Specific error details"]
  }
}
```

## Validation

Input validation includes:
- Name: Required, 1-255 characters
- Description: Required, 1-1000 characters
- ItemId: Must be valid UUID v4 format

## Local Development

Run the API locally:
```bash
npm run local
```

This starts the API at `http://localhost:3000`

## Monitoring and Logs

View function logs:
```bash
# View logs for a specific function
serverless logs -f createItem --tail

# View logs for all functions
serverless logs --tail
```

## Cleanup

Remove all AWS resources:
```bash
npm run remove
```

## Design Assumptions

1. **Item IDs**: Auto-generated UUID v4 for uniqueness across distributed systems
2. **Optimistic Locking**: Version field for conflict detection
3. **Timestamps**: ISO 8601 format for universal compatibility
4. **Billing**: DynamoDB on-demand pricing for variable workloads
5. **CORS**: Enabled for browser-based clients
6. **Idempotency**: Create operations check for existing items
7. **Soft Deletes**: Not implemented; hard deletes used for simplicity
8. **Authentication**: Not implemented; should add API keys or Cognito in production

## Production Considerations

For production deployment, consider:

1. Add AWS WAF for API protection
2. Implement API key authentication or AWS Cognito
3. Enable CloudWatch alarms for error rates and latency
4. Add DynamoDB backup and point-in-time recovery
5. Implement request throttling and rate limiting
6. Add X-Ray for distributed tracing
7. Use custom domain name with Route 53
8. Implement CI/CD pipeline for automated deployments

## Cost Optimization

- DynamoDB on-demand billing scales with usage
- Lambda charges only for execution time
- API Gateway pricing based on requests
- Estimated cost for 1M requests/month: ~$5-10
```