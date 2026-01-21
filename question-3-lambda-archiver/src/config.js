module.exports = {
  sourceTable: process.env.SOURCE_TABLE,
  archiveBucket: process.env.ARCHIVE_BUCKET,
  archiveDays: parseInt(process.env.ARCHIVE_DAYS || '30', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
  region: process.env.REGION || 'us-east-1',
};
