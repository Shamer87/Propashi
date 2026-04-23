import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { default: dbConnect } = await import('../src/lib/mongoose');
  const { default: Person } = await import('../src/models/Person');
  
  await dbConnect();
  
  const samples = await Person.find({ direction: { $exists: true, $ne: '' } })
    .select('direction locationOfEvent extraInfo')
    .limit(20)
    .lean();
    
  samples.forEach((s: any) => {
    console.log('DIR:', s.direction, '| LOC:', s.locationOfEvent || '-', '| EXTRA:', s.extraInfo?.substring(0, 80) || '-');
  });
  
  const totalWithDir = await Person.countDocuments({ direction: { $exists: true, $ne: '' } });
  console.log('Total with direction:', totalWithDir);
  process.exit(0);
}

main().catch(console.error);
