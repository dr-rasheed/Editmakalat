import { db } from './db.ts';
import { normalizeText, cleanUthmani } from './utils.ts';

export async function initializeDatabase() {
  try {
    // Check if already populated
    const count = db.prepare('SELECT COUNT(*) as count FROM quran').get() as { count: number };
    if (count.count >= 6236) {
      console.log('Quran database already populated. Checking for Tatweel characters...');
      // One-time cleanup for existing data (0x0640 = 1600 decimal)
      db.prepare("UPDATE quran SET text_uthmani = replace(text_uthmani, char(1600), '') WHERE text_uthmani LIKE '%' || char(1600) || '%'").run();
      console.log('Quran database already populated and cleaned. Skipping initialization.');
      return;
    }

    console.log('Fetching Quran data from Al Quran Cloud (Tanzil/Quran.com source)...');
    
    // Fetch Simple Text (for search)
    const simpleRes = await fetch('http://api.alquran.cloud/v1/quran/quran-simple-clean');
    const simpleData = await simpleRes.json();
    
    // Fetch Uthmani Text (for display)
    const uthmaniRes = await fetch('http://api.alquran.cloud/v1/quran/quran-uthmani');
    const uthmaniData = await uthmaniRes.json();

    if (simpleData.code !== 200 || uthmaniData.code !== 200) {
      throw new Error('Failed to fetch data from Al Quran Cloud');
    }

    const insert = db.prepare('INSERT OR IGNORE INTO quran (id, surah, ayah, text_clean, text_uthmani) VALUES (?, ?, ?, ?, ?)');
    
    const simpleSurahs = simpleData.data.surahs;
    const uthmaniSurahs = uthmaniData.data.surahs;

    for (let i = 0; i < 114; i++) {
      // Small transaction per surah to avoid blocking the event loop for too long
      const transaction = db.transaction(() => {
        const sSurah = simpleSurahs[i];
        const uSurah = uthmaniSurahs[i];
        
        for (let j = 0; j < sSurah.ayahs.length; j++) {
          const sAyah = sSurah.ayahs[j];
          const uAyah = uSurah.ayahs[j];
          insert.run(sAyah.number, sSurah.number, sAyah.numberInSurah, normalizeText(sAyah.text), cleanUthmani(uAyah.text));
        }
      });
      
      transaction();
      // Yield to event loop
      await new Promise(resolve => setImmediate(resolve));
    }
    
    console.log('Quran database initialized successfully.');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export async function searchQuranDotCom(query: string, ayahNumber: number): Promise<any | null> {
  try {
    // Search for the text
    const url = `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=20`;
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.search || !data.search.results) return null;

    // Filter results that match the ayah number
    const match = data.search.results.find((r: any) => {
      const parts = r.verse_key.split(':');
      return parseInt(parts[1]) === ayahNumber;
    });

    if (match) {
      const parts = match.verse_key.split(':');
      const surah = parseInt(parts[0]);
      const ayah = parseInt(parts[1]);
      
      const localMatch = db.prepare('SELECT * FROM quran WHERE surah = ? AND ayah = ?').get(surah, ayah);
      return localMatch;
    }
    return null;
  } catch (e) {
    console.error('Quran.com search failed:', e);
    return null;
  }
}
