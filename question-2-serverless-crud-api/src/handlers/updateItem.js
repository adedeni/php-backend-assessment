const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDb } = require('../config/dynamodb');
const { successResponse, errorResponse } = require('../utils/response');
const { validateItemData, validateItemId } = require('../utils/validation');

exports.handler = async (event) => {
  try {
    const { itemId } = event.pathParameters || {};
    const requestBody = JSON.parse(event.body || '{}');
    
    const idValidation = validateItemId(itemId);
    if (!idValidation.isValid) {
      return errorResponse('Validation failed', 400, idValidation.errors);
    }
    
    const dataValidation = validateItemData(requestBody);
    if (!dataValidation.isValid) {
      return errorResponse('Validation failed', 400, dataValidation.errors);
    }
    
    const timestamp = new Date().toISOString();
    
    const params = {
      TableName: process.env.ITEMS_TABLE,
      Key: { itemId },
      UpdateExpression: 'SET #name = :name, description = :description, updatedAt = :updatedAt, version = version + :increment',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':name': requestBody.name.trim(),
        ':description': requestBody.description.trim(),
        ':updatedAt': timestamp,
        ':increment': 1,
      },
      ConditionExpression: 'attribute_exists(itemId)',
      ReturnValues: 'ALL_NEW',
    };
    
    const result = await dynamoDb.send(new UpdateCommand(params));
    
    return successResponse(result.Attributes);
    
  } catch (error) {
    console.error('Error updating item:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse('Item not found', 404);
    }
    
    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    return errorResponse('Internal server error', 500);
  }
};
