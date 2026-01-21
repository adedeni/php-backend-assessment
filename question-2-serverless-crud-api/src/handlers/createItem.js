const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../config/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { validateItemData } = require('../utils/validation');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  try {
    const requestBody = JSON.parse(event.body || '{}');
    
    const validation = validateItemData(requestBody);
    if (!validation.isValid) {
      return errorResponse('Validation failed', 400, validation.errors);
    }
    
    const itemId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const item = {
      itemId,
      name: requestBody.name.trim(),
      description: requestBody.description.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    
    const params = {
      TableName: process.env.ITEMS_TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(itemId)',
    };
    
    await dynamoDb.send(new PutCommand(params));
    
    return successResponse(item, 201);
    
  } catch (error) {
    console.error('Error creating item:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse('Item already exists', 409);
    }
    
    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    return errorResponse('Internal server error', 500);
  }
};
