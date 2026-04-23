import mongoose from 'mongoose';
import Invite from './src/models/Invite.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function clearCorruptInvites() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  const result = await Invite.deleteMany({});
  console.log(`Deleted ${result.deletedCount} old invites to clear corrupted data.`);
  process.exit(0);
}

clearCorruptInvites();
