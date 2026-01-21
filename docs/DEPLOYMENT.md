# Deployment Guide

This guide covers deployment procedures for all three solutions.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Serverless Framework installed (`npm install -g serverless`)
- Node.js 18.x or higher
- PHP 8.x or higher (for Question 1)

## Question 1: Workload Characterization

### Database Setup
```bash
cd question-1-workload-characterization
mysql -u root -p < database/schema.sql
```

### Configuration
Configure your database and cache connections in your PHP framework.

## Question 2: Serverless CRUD API

### Deploy to AWS
```bash
cd question-2-serverless-crud-api
npm install
serverless deploy --stage dev
```

### Test Deployment
```bash
# Get API endpoint from deployment output
curl https://YOUR_API_ENDPOINT/dev/items
```

## Question 3: Lambda Archiver

### Deploy to AWS
```bash
cd question-3-lambda-archiver
npm install
serverless deploy --stage dev
```

### Manual Test
```bash
serverless invoke -f archiveOldItems
```

## Environment-Specific Deployments

### Development
```bash
serverless deploy --stage dev
```

### Production
```bash
serverless deploy --stage prod
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   - Run `aws configure`
   - Verify IAM permissions

2. **Deployment Timeout**
   - Check internet connection
   - Increase timeout in serverless.yml

3. **Permission Denied**
   - Verify IAM roles have necessary permissions
   - Check bucket policies

## Rollback
```bash
serverless remove --stage dev
```

## Monitoring

Access CloudWatch Logs:
```bash
serverless logs -f functionName --tail
```
