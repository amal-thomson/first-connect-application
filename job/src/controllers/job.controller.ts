import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import { Parser } from 'json2csv';
import { logger } from '../utils/logger.utils';
import { allOrders } from '../orders/fetch.orders';
import CustomError from '../errors/custom.error';

// Instantiate a Google Cloud Storage client
const storage = new Storage();
const bucketName = 'my-order-bucket-csv'; // Replace with your actual bucket name

export const post = async (_request: Request, response: Response) => {
  try {
    // Get the orders
    const limitedOrdersObject = await allOrders({ sort: ['lastModifiedAt'] });
    logger.info(`There are ${limitedOrdersObject.total} orders!`);

    // Extract order IDs
    const orderIds = limitedOrdersObject.results.map((order: any) => ({
      orderId: order.id,
    }));

    // Convert order IDs to CSV
    const json2csvParser = new Parser({ fields: ['orderId'] });
    const csv = json2csvParser.parse(orderIds);

    // Define the file name with today's date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // e.g., "2024-09-04"
    const fileName = `${dateStr}-orders.csv`;

    // Upload the CSV to Google Cloud Storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    await file.save(csv, {
      gzip: true,
      metadata: {
        contentType: 'text/csv',
      },
    });

    logger.info(`Order IDs have been uploaded to ${fileName} in ${bucketName}`);
    response.status(200).send('CSV file uploaded successfully!');
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    response.status(500).send('Internal Server Error - Error processing orders and uploading to GCS');
  }
};
