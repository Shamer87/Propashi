/**
 * Bulk geocoding using only the local dictionary (very fast).
 */
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { default: dbConnect } = await import('../src/lib/mongoose');
  const { default: Person } = await import('../src/models/Person');
  const { geocodeFromText } = await import('../src/lib/geocode');
  
  await dbConnect();
  
  const records = await Person.find({
    $or: [
      { coordinates: null },
      { coordinates: { $exists: false } },
    ]
  });
  
  console.log(`Analyzing ${records.length} records for fast dictionary geocoding...`);
  
  let geocoded = 0;
  
  const updates = [];
  
  for (const record of records) {
    let coords = null;
    
    // Check location
    if (record.locationOfEvent) {
      coords = geocodeFromText(record.locationOfEvent);
    }
    
    // Check extra info
    if (!coords && record.extraInfo) {
      coords = geocodeFromText(record.extraInfo);
    }
    
    // Check direction
    if (!coords && record.direction) {
      coords = geocodeFromText(record.direction);
    }
    
    if (coords) {
      updates.push({
        updateOne: {
          filter: { _id: record._id },
          update: { $set: { coordinates: coords } }
        }
      });
      geocoded++;
    }
  }
  
  console.log(`Found ${geocoded} records that match dictionary. Applying bulk update...`);
  
  if (updates.length > 0) {
    const result = await Person.collection.bulkWrite(updates);
    console.log(`Modified ${result.modifiedCount} documents.`);
  }
  
  process.exit(0);
}

main().catch(console.error);
