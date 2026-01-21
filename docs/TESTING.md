# Testing Guide

Comprehensive testing procedures for all solutions.

## Question 1: Workload Characterization

### Unit Tests
```bash
cd question-1-workload-characterization
phpunit tests/
```

### Integration Tests
Test with your PHP framework's testing tools.

## Question 2: CRUD API Testing

### Unit Tests
```bash
cd question-2-serverless-crud-api
npm test
```

### Manual API Testing

**Create Item:**
```bash
curl -X POST https://YOUR_API/dev/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "description": "Testing"}'
```

**Get Item:**
```bash
curl https://YOUR_API/dev/items/ITEM_ID
```

**Update Item:**
```bash
curl -X PUT https://YOUR_API/dev/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated", "description": "Updated desc"}'
```

**Delete Item:**
```bash
curl -X DELETE https://YOUR_API/dev/items/ITEM_ID
```

## Question 3: Archiver Testing

### Unit Tests
```bash
cd question-3-lambda-archiver
npm test
```

### Integration Test
```bash
# Invoke function
serverless invoke -f archiveOldItems

# Check S3 for archives
aws s3 ls s3://YOUR_BUCKET/archives/ --recursive

# Verify DynamoDB
aws dynamodb scan --table-name YOUR_TABLE
```

## Load Testing

Use tools like Apache Bench or Artillery for load testing:
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 https://YOUR_API/dev/items
```

## Test Coverage

All solutions include:
- ✅ Unit tests for core logic
- ✅ Integration test examples
- ✅ Manual testing procedures
- ✅ Error case coverage
