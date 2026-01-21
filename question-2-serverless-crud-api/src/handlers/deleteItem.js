const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
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
      ConditionExpression: 'attribute_exists(itemId)',
      ReturnValues: 'ALL_OLD',
    };
    
    const result = await dynamoDb.send(new DeleteCommand(params));
    
    if (!result.Attributes) {
      return errorResponse('Item not found', 404);
    }
    
    return successResponse({ 
      message: 'Item deleted successfully',
      deletedItem: result.Attributes,
    });
    
  } catch (error) {
    console.error('Error deleting item:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return errorResponse('Item not found', 404);
    }
    
    return errorResponse('Internal server error', 500);
  }
};
