import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkUsers() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  const users = await User.find({}).select('username role').lean();
  users.forEach(u => console.log(`${u.username} => ${u.role}`));
  
  process.exit(0);
}

checkUsers();
