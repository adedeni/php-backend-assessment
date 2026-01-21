const successResponse = (data, statusCode = 200) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({
    success: true,
    data,
  }),
});

const errorResponse = (message, statusCode = 400, errors = null) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({
    success: false,
    error: {
      message,
      ...(errors && { details: errors }),
    },
  }),
});

module.exports = { successResponse, errorResponse };
