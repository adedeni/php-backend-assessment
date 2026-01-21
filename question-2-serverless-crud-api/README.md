# Question 2: Serverless CRUD API

Complete REST API with AWS Lambda, API Gateway, and DynamoDB.

## Quick Start
```bash
npm install
npm run deploy
```

## API Endpoints

- `POST /items` - Create item
- `GET /items/{itemId}` - Get item
- `PUT /items/{itemId}` - Update item
- `DELETE /items/{itemId}` - Delete item

## Documentation

Full documentation in the project artifact.

## Testing
```bash
# Local testing
npm run local

# Deploy to AWS
npm run deploy

# View logs
npm run logs createItem
```
