import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Person from '../src/models/Person';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/propashi';

// Map CSV statuses to the ENUM
const statusMap: Record<string, string> = {
  'KILLED': 'KILLED',
  'MISSING': 'MISSING',
  'CAPTURED': 'CAPTURED',
  'ПЛЕН': 'CAPTURED',
  'ПОГИБ': 'KILLED',
  'ЗНИК': 'MISSING',
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const filesToParse = [
      'records_killed.csv',
      'records_missing.csv',
      'records_parsed.csv',
      'records_prisoners.csv'
    ];

    let totalInserted = 0;

    for (const file of filesToParse) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.warn(`File ${file} not found, skipping...`);
        continue;
      }

      console.log(`Parsing ${file}...`);
      
      const records: any[] = [];
      const batchSize = 1000;
      let count = 0;

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            const statusKey = row.status ? row.status.toUpperCase() : 'UNKNOWN';
            
            // Map the row fields to our Person schema
            records.push({
              externalId: row.id,
              status: statusMap[statusKey] || 'UNKNOWN',
              fullName: row.full_name,
              dob: row.dob,
              callsign: row.callsign,
              jeton: row.jeton,
              pob: row.pob,
              unit: row.unit,
              dateOfEvent: row.date_event,
              locationOfEvent: row.location_event,
              direction: row.direction,
              extraInfo: row.extra_info,
              isApproved: true, // Imported from valid CSVs
            });
            count++;
          })
          .on('end', async () => {
            console.log(`Finished reading ${count} rows from ${file}.`);
            // Insert in batches
            try {
              for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                await Person.insertMany(batch, { ordered: false }); // ignore duplicates if any
                process.stdout.write(`Inserted ${i + batch.length} / ${records.length} \r`);
              }
              console.log(`\nSuccessfully inserted records for ${file}.`);
              totalInserted += records.length;
              resolve();
            } catch (err) {
              reject(err);
            }
          })
          .on('error', reject);
      });
    }

    console.log(`Seeding complete! Total inserted: ${totalInserted}`);
    process.exit(0);

  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();
