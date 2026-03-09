import mammoth from 'mammoth';
import { marked } from 'marked';
import JSZip from 'jszip';
import WordExtractor from 'word-extractor';

export async function convertFile(file: any): Promise<string> {
  let html = '';
  const buffer = file.buffer;
  const mime = file.mimetype;
  const originalName = file.originalname.toLowerCase();

  if (originalName.endsWith('.docx')) {
    const result = await mammoth.convertToHtml({ buffer: buffer });
    html = result.value;

    // Try to extract footers using JSZip (reading raw XML)
    // This is more reliable for finding footer content that libraries might miss
    try {
      const zip = await JSZip.loadAsync(buffer);
      
      // Find all footer XML files (e.g., word/footer1.xml)
      const footerFiles = Object.keys(zip.files).filter(filename => 
        filename.match(/^word\/footer\d+\.xml$/i)
      );

      // Sort by number to maintain order
      footerFiles.sort((a, b) => {
        const aMatch = a.match(/\d+/);
        const bMatch = b.match(/\d+/);
        const aNum = aMatch ? parseInt(aMatch[0]) : 0;
        const bNum = bMatch ? parseInt(bMatch[0]) : 0;
        return aNum - bNum;
      });

      let allFooterText = '';
      const seenParagraphs = new Set();

      for (const filename of footerFiles) {
        const xml = await zip.file(filename)?.async('string');
        if (!xml) continue;
        
        // Extract paragraphs <w:p>
        const pMatches = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
        
        for (const pXml of pMatches) {
          // Extract text <w:t>
          const tMatches = pXml.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
          let pText = '';
          
          for (const tXml of tMatches) {
             // Remove tags to get content
             const content = tXml.replace(/<[^>]+>/g, '');
             pText += content;
          }
          
          const cleanText = pText.trim();
          if (cleanText && !seenParagraphs.has(cleanText)) {
            // Avoid duplicates if multiple footers have same text
            seenParagraphs.add(cleanText);
            allFooterText += `<p>${pText}</p>`;
          }
        }
      }

      if (allFooterText) {
         html += `<div class="footer-extraction" style="margin-top: 2em; border-top: 1px solid #eee; padding-top: 1em;">${allFooterText}</div>`;
      }

    } catch (e) {
      console.error('Footer extraction error:', e);
    }
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
