import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';

// Fix current working dir since we run this from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixRoles() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  const result = await User.updateMany({}, { $set: { role: 'ADMIN' } });
  console.log(`Updated ${result.modifiedCount} users to ADMIN.`);
  process.exit(0);
}

fixRoles();
