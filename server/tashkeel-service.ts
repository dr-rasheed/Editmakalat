import { GoogleGenAI } from "@google/genai";
import { load } from 'cheerio';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function addTashkeel(html: string): Promise<string> {
  // Load HTML as a fragment (third argument false)
  const $ = load(html, null, false);

  const textNodes: { index: number, text: string, node: any }[] = [];
  let counter = 0;

  // Recursive function to traverse and find text nodes
  function traverse(node: any) {
    if (node.type === 'text') {
      const text = node.data;
      // Only process if it has Arabic characters
      if (text && /[\u0600-\u06FF]/.test(text)) {
         // Check if parent is .quran-verse
         let parent = node.parent;
         let isQuran = false;
         while(parent) {
            if (parent.attribs && parent.attribs.class && parent.attribs.class.includes('quran-verse')) {
                isQuran = true;
                break;
            }
            parent = parent.parent;
         }

         if (!isQuran) {
             textNodes.push({ index: counter++, text: text, node: node });
         }
      }
    } else if (node.type === 'tag' || node.type === 'root') {
      if (node.children) {
        node.children.forEach((child: any) => traverse(child));
      }
    }
  }

  // @ts-ignore - cheerio types might be slightly off for root access in some versions
  if ($?.root) {
      traverse($.root()[0]);
  } else {
      // Fallback if root() is not available or behaves differently
      traverse(($ as any)._root);
  }

  if (textNodes.length === 0) return html;

  // Process in chunks to avoid context limits
  const chunkSize = 20; // Smaller chunk size to be safe with JSON overhead
  
  for (let i = 0; i < textNodes.length; i += chunkSize) {
    const chunk = textNodes.slice(i, i + chunkSize);
    const textsToProcess = chunk.map(n => n.text);

    try {
        const prompt = `Add full Arabic diacritics (Tashkeel) to the Arabic text in the following JSON array of strings.
        Return ONLY the JSON array of strings with diacritics.
        Do NOT change any words, punctuation, or non-Arabic text.
        Do NOT add any markdown formatting or explanations.
        Input: ${JSON.stringify(textsToProcess)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const resultText = response.text;
        if (resultText) {
            const processedTexts = JSON.parse(resultText);
            if (Array.isArray(processedTexts) && processedTexts.length === chunk.length) {
                chunk.forEach((item, idx) => {
                    // Update the node data in cheerio
                    item.node.data = processedTexts[idx];
                });
            } else {
                console.error("Mismatch in returned array length from Gemini");
            }
        }
    } catch (e) {
        console.error("Error processing chunk for Tashkeel", e);
        // Continue with other chunks
    }
  }

  return $.html();
}
