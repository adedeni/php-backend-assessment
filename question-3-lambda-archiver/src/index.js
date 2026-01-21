const DataArchiver = require('./archiver');

exports.handler = async (event, context) => {
  console.log('Lambda function invoked');
  const archiver = new DataArchiver();

  try {
    const result = await archiver.archiveOldItems();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Archival process completed successfully',
        result,
      }),
    };
  } catch (error) {
    console.error('Archival process failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Archival process failed',
        error: error.message,
      }),
    };
  }
};
