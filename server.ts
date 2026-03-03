import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// Import from new modules
import { initializeDatabase } from './server/quran-service.ts';
import { convertFile } from './server/file-service.ts';
import { analyzeText } from './server/analyzer.ts';
import { addTashkeel } from './server/tashkeel-service.ts';

// Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    
    const html = await convertFile(file);
    res.json({ html });
  } catch (error: any) {
    console.error('Conversion error:', error);
    if (error.message === 'Unsupported file type') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Conversion failed' });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: 'No HTML provided' });

  try {
    const result = await analyzeText(html);
    res.json({ html: result.html, issues: result.issues });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/tashkeel', async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: 'No HTML provided' });

  try {
    const result = await addTashkeel(html);
    res.json({ html: result });
  } catch (error) {
    console.error('Tashkeel error:', error);
    res.status(500).json({ error: 'Tashkeel failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // SPA fallback
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'Not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.error('Dist folder not found. Run `npm run build` first.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Initialize DB in background
    initializeDatabase().catch(err => console.error('Background DB init failed:', err));
  });
}

startServer();
