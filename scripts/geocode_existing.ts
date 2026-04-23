/**
 * Migration script: auto-geocode existing records that have locationOfEvent but no coordinates.
 * Run with: npx tsx scripts/geocode_existing.ts
 */
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { default: dbConnect } = await import('../src/lib/mongoose');
  const { default: Person } = await import('../src/models/Person');
  const { autoGeocode } = await import('../src/lib/geocode');
  
  await dbConnect();
  
  // Find all records without coordinates
  const records = await Person.find({
    $or: [
      { coordinates: null },
      { coordinates: { $exists: false } },
    ]
  });
  
  console.log(`Found ${records.length} records without coordinates.`);
  
  let geocoded = 0;
  let failed = 0;
  
  for (const record of records) {
    const coords = await autoGeocode(record.locationOfEvent, record.extraInfo);
    
    if (coords) {
      record.coordinates = coords;
      await record.save();
      geocoded++;
      console.log(`✅ ${record.fullName}: ${record.locationOfEvent} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } else {
      failed++;
      console.log(`❌ ${record.fullName}: "${record.locationOfEvent || 'немає даних'}" — не вдалося визначити координати`);
    }
    
    // Small delay to respect Nominatim rate limits
    await new Promise(r => setTimeout(r, 1100));
  }
  
  console.log(`\nГотово! Геокодовано: ${geocoded}, Не вдалося: ${failed}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
