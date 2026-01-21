const { DynamoDBClient, ScanCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('./config');

class DataArchiver {
  constructor() {
    const dynamoClient = new DynamoDBClient({ region: config.region });
    this.dynamoDb = DynamoDBDocumentClient.from(dynamoClient);
    this.s3 = new S3Client({ region: config.region });
    
    this.stats = {
      scanned: 0,
      archived: 0,
      deleted: 0,
      errors: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Main archiving process
   */
  async archiveOldItems() {
    console.log('Starting archival process...', {
      table: config.sourceTable,
      bucket: config.archiveBucket,
      cutoffDays: config.archiveDays,
    });

    const cutoffDate = this.calculateCutoffDate();
    const itemsToArchive = [];
    let lastEvaluatedKey = null;

    try {
      // Scan DynamoDB for items older than cutoff date
      do {
        const scanResult = await this.scanTable(lastEvaluatedKey, cutoffDate);
        
        this.stats.scanned += scanResult.Items?.length || 0;
        
        if (scanResult.Items && scanResult.Items.length > 0) {
          const oldItems = scanResult.Items.map(item => unmarshall(item));
          itemsToArchive.push(...oldItems);
        }
        
        lastEvaluatedKey = scanResult.LastEvaluatedKey;
        
        // Process in batches to avoid memory issues
        if (itemsToArchive.length >= config.batchSize) {
          await this.processBatch(itemsToArchive.splice(0, config.batchSize));
        }
        
      } while (lastEvaluatedKey);

      // Process remaining items
      if (itemsToArchive.length > 0) {
        await this.processBatch(itemsToArchive);
      }

      const duration = (Date.now() - this.stats.startTime) / 1000;
      
      console.log('Archival process completed', {
        ...this.stats,
        durationSeconds: duration,
      });

      return {
        success: true,
        stats: this.stats,
        duration,
      };

    } catch (error) {
      console.error('Archival process failed:', error);
      throw error;
    }
  }

  /**
   * Calculate cutoff date for archiving
   */
  calculateCutoffDate() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.archiveDays);
    return cutoff.toISOString();
  }

  /**
   * Scan DynamoDB table for items
   */
  async scanTable(lastEvaluatedKey, cutoffDate) {
    const params = {
      TableName: config.sourceTable,
      FilterExpression: 'createdAt < :cutoffDate',
      ExpressionAttributeValues: marshall({
        ':cutoffDate': cutoffDate,
      }),
      Limit: config.batchSize,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const client = new DynamoDBClient({ region: config.region });
      const command = new ScanCommand(params);
      return await client.send(command);
    } catch (error) {
      console.error('Error scanning table:', error);
      throw error;
    }
  }

  /**
   * Process a batch of items: archive to S3 and delete from DynamoDB
   */
  async processBatch(items) {
    if (items.length === 0) return;

    console.log(`Processing batch of ${items.length} items...`);

    // Archive to S3
    const archiveKey = this.generateArchiveKey();
    await this.archiveToS3(items, archiveKey);
    this.stats.archived += items.length;

    // Delete from DynamoDB
    await this.deleteFromDynamoDB(items);
    this.stats.deleted += items.length;

    console.log(`Batch processed: ${items.length} items archived and deleted`);
  }

  /**
   * Generate S3 key for archive file
   */
  generateArchiveKey() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const timestamp = now.getTime();
    
    return `archives/${year}/${month}/${day}/archive-${timestamp}.json`;
  }

  /**
   * Archive items to S3
   */
  async archiveToS3(items, key) {
    const archiveData = {
      archiveDate: new Date().toISOString(),
      itemCount: items.length,
      cutoffDays: config.archiveDays,
      items: items,
    };

    const params = {
      Bucket: config.archiveBucket,
      Key: key,
      Body: JSON.stringify(archiveData, null, 2),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
      Metadata: {
        'archive-date': archiveData.archiveDate,
        'item-count': String(items.length),
        'source-table': config.sourceTable,
      },
    };

    try {
      const command = new PutObjectCommand(params);
      await this.s3.send(command);
      console.log(`Archived ${items.length} items to S3: ${key}`);
    } catch (error) {
      console.error('Error archiving to S3:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Delete items from DynamoDB
   */
  async deleteFromDynamoDB(items) {
    // Process deletes in chunks of 25 (DynamoDB batch limit)
    const chunks = this.chunkArray(items, 25);

    for (const chunk of chunks) {
      await this.deleteBatch(chunk);
    }
  }

  /**
   * Delete a batch of items using BatchWriteItem
   */
  async deleteBatch(items) {
    const deleteRequests = items.map(item => ({
      DeleteRequest: {
        Key: marshall({ itemId: item.itemId }),
      },
    }));

    const params = {
      RequestItems: {
        [config.sourceTable]: deleteRequests,
      },
    };

    try {
      const client = new DynamoDBClient({ region: config.region });
      const command = new BatchWriteItemCommand(params);
      const result = await client.send(command);

      // Handle unprocessed items
      if (result.UnprocessedItems && 
          Object.keys(result.UnprocessedItems).length > 0) {
        console.warn('Some items were not processed, retrying...');
        await this.retryUnprocessedItems(result.UnprocessedItems);
      }

    } catch (error) {
      console.error('Error deleting batch from DynamoDB:', error);
      this.stats.errors++;
      
      // Fall back to individual deletes
      await this.deleteIndividually(items);
    }
  }

  /**
   * Retry unprocessed items with exponential backoff
   */
  async retryUnprocessedItems(unprocessedItems, attempt = 1, maxAttempts = 3) {
    if (attempt > maxAttempts) {
      console.error('Max retry attempts reached for unprocessed items');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    await this.sleep(delay);

    const params = { RequestItems: unprocessedItems };
    
    try {
      const client = new DynamoDBClient({ region: config.region });
      const command = new BatchWriteItemCommand(params);
      const result = await client.send(command);

      if (result.UnprocessedItems && 
          Object.keys(result.UnprocessedItems).length > 0) {
        await this.retryUnprocessedItems(result.UnprocessedItems, attempt + 1, maxAttempts);
      }
    } catch (error) {
      console.error(`Retry attempt ${attempt} failed:`, error);
      await this.retryUnprocessedItems(unprocessedItems, attempt + 1, maxAttempts);
    }
  }

  /**
   * Delete items individually (fallback method)
   */
  async deleteIndividually(items) {
    console.log(`Falling back to individual deletes for ${items.length} items`);
    
    for (const item of items) {
      try {
        const params = {
          TableName: config.sourceTable,
          Key: { itemId: item.itemId },
        };
        
        await this.dynamoDb.send(new DeleteCommand(params));
      } catch (error) {
        console.error(`Failed to delete item ${item.itemId}:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Utility: Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DataArchiver;