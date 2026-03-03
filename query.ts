import { initializeDatabase } from './server/quran-service.ts';
import { db } from './server/db.ts';

async function main() {
  await initializeDatabase();
  const verse = db.prepare('SELECT * FROM quran WHERE surah=15 AND ayah=53').get();
  console.log(verse);
}
main();
