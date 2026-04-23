import dbConnect from '../src/lib/mongoose';
import Person from '../src/models/Person';

function parseDateStr(str: string | undefined): Date | null {
  if (!str) return null;
  // Match DD.MM.YYYY
  const match = str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

async function run() {
  await dbConnect();
  
  const cursor = Person.find({}).cursor();
  let count = 0;
  let bulkOps = [];

  for await (const doc of cursor) {
    let needsUpdate = false;
    let updateDoc: any = {};

    const pdob = parseDateStr(doc.dob);
    if (pdob) {
      updateDoc.dobParsed = pdob;
      needsUpdate = true;
    }

    const pevent = parseDateStr(doc.dateOfEvent);
    if (pevent) {
      updateDoc.dateOfEventParsed = pevent;
      needsUpdate = true;
    }

    if (needsUpdate) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: updateDoc }
        }
      });
    }

    if (bulkOps.length === 1000) {
      await Person.bulkWrite(bulkOps);
      bulkOps = [];
      count += 1000;
      process.stdout.write(`Migrated ${count} records\r`);
    }
  }

  if (bulkOps.length > 0) {
    await Person.bulkWrite(bulkOps);
    count += bulkOps.length;
  }

  console.log(`\nMigration complete. Updated ${count} records with parseable dates.`);
  process.exit(0);
}

run();
