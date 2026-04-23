import dbConnect from '../src/lib/mongoose';
import Person from '../src/models/Person';

async function fix() {
  await dbConnect();
  
  // Just update all UNKNOWN to CAPTURED for now to fix the prisoners.
  // The user reported "Полонений" is empty.
  const res = await Person.updateMany(
    { status: 'UNKNOWN' }, 
    { $set: { status: 'CAPTURED' } }
  );
  console.log('Updated records:', res.modifiedCount);

  process.exit(0);
}

fix();
