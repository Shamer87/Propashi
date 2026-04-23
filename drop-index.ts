import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function dropOldIndexes() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  try {
    await User.collection.dropIndex('email_1');
    console.log('Successfully dropped old email_1 index!');
  } catch (err: any) {
    console.log('Index drop failed or already dropped:', err.message);
  }
  
  process.exit(0);
}

dropOldIndexes();
