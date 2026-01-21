const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../config/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { validateItemId } = require('../utils/validation');

exports.handler = async (event) => {
  try {
    const { itemId } = event.pathParameters || {};
    
    const validation = validateItemId(itemId);
    if (!validation.isValid) {
      return errorResponse('Validation failed', 400, validation.errors);
    }
    
    const params = {
      TableName: process.env.ITEMS_TABLE,
      Key: { itemId },
    };
    
    const result = await dynamoDb.send(new GetCommand(params));
    
    if (!result.Item) {
      return errorResponse('Item not found', 404);
    }
    
    return successResponse(result.Item);
    
  } catch (error) {
    console.error('Error retrieving item:', error);
    return errorResponse('Internal server error', 500);
  }
};
