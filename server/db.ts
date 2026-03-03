import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const db = new Database(path.join(__dirname, 'quran.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS quran (
    id INTEGER PRIMARY KEY,
    surah INTEGER,
    ayah INTEGER,
    text_clean TEXT,
    text_uthmani TEXT
  );
`);
