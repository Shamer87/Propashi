import mongoose from 'mongoose';
import Person from './src/models/Person.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkCoords() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  const total = await Person.countDocuments({});
  const withCoords = await Person.countDocuments({ 'coordinates.lat': { $exists: true, $ne: null } });
  const withLocationOfEvent = await Person.countDocuments({ locationOfEvent: { $exists: true, $ne: null, $ne: '' } });
  
  console.log(`Total: ${total}, With Coords: ${withCoords}, With Location String: ${withLocationOfEvent}`);
  
  const sample = await Person.findOne({ locationOfEvent: { $exists: true, $ne: null, $ne: '' } }).select('locationOfEvent coordinates').lean();
  console.log('Sample record with location:', JSON.stringify(sample, null, 2));
  
  process.exit(0);
}

checkCoords();
