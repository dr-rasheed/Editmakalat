import mammoth from 'mammoth';
import { marked } from 'marked';
import WordExtractor from 'word-extractor';

export async function convertFile(file: any): Promise<string> {
  let html = '';
  const buffer = file.buffer;
  const mime = file.mimetype;
  const originalName = file.originalname.toLowerCase();

  if (originalName.endsWith('.docx')) {
    const result = await mammoth.convertToHtml({ buffer: buffer });
    html = result.value;
  } else if (originalName.endsWith('.doc')) {
    try {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      const text = extracted.getBody();
      
      // Convert raw text to simple HTML paragraphs
      html = text
        .split(/\n\s*\n/) // Split by double newlines to make paragraphs
        .filter(p => p.trim())
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('\n');
    } catch (error) {
      console.error('Error extracting .doc file:', error);
      throw new Error('Failed to parse .doc file. Please ensure it is a valid Word document.');
    }
  } else if (originalName.endsWith('.md')) {
    html = await marked(buffer.toString('utf-8'));
  } else if (mime.includes('text/plain') || originalName.endsWith('.txt')) {
    html = `<p>${buffer.toString('utf-8').replace(/\n/g, '<br>')}</p>`;
  } else {
    throw new Error('Unsupported file type');
  }
  return html;
}
