import { db } from './db.ts';
import { normalizeText, convertArabicDigitsToEnglish, convertEnglishDigitsToArabic, SURAH_NAMES, cleanUthmani } from './utils.ts';
import { searchQuranDotCom } from './quran-service.ts';
import { load } from 'cheerio';
import { enhanceStyles } from './style-enhancer.ts';
import { checkCompliance, ComplianceIssue } from './compliance-checker.ts';

function replaceWithTagBalancing(html: string, start: number, end: number, replacement: string) {
  const deletedStr = html.substring(start, end);
  const tagsMatch = [...deletedStr.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi)];
  let openTags: { name: string, full: string }[] = [];
  let danglingClosingTags: string[] = [];
  
  for (const tm of tagsMatch) {
    const isClosing = tm[0].startsWith('</');
    const tagName = tm[1].toLowerCase();
    if (['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName)) continue;
    
    if (isClosing) {
      if (openTags.length > 0 && openTags[openTags.length - 1].name === tagName) {
        openTags.pop();
      } else {
        danglingClosingTags.push(tm[0]);
      }
    } else {
      openTags.push({ name: tagName, full: tm[0] });
    }
  }
  
  const preReplacement = danglingClosingTags.join('');
  const postReplacement = openTags.map(t => t.full).join('');
  
  return html.substring(0, start) + preReplacement + replacement + postReplacement + html.substring(end);
}

interface Token { word: string; start: number; end: number; }
function tokenizeHTML(htmlStr: string): Token[] {
  const tokens: Token[] = [];
  let inTag = false;
  let inQuote = false;
  let quoteChar = '';
  let currentWord = '';
  let wordStart = -1;
  
  for (let i = 0; i < htmlStr.length; i++) {
    const char = htmlStr[i];
    
    if (inTag) {
      if (inQuote) {
        if (char === quoteChar) {
          inQuote = false;
          quoteChar = '';
        }
      } else {
        if (char === '"' || char === "'") {
          inQuote = true;
          quoteChar = char;
        } else if (char === '>') {
          inTag = false;
        }
      }
      continue;
    }

    if (char === '<') { 
      if (currentWord.trim().length > 0) {
        tokens.push({ word: currentWord, start: wordStart, end: i });
      }
      currentWord = '';
      wordStart = -1;
      inTag = true; 
      continue; 
    }
    
    if (/\s/.test(char) || char === '&' || char === ';' || /[\(\)\[\]\{\}\.\,\:\!\?،؛\*\-\_﴿﴾«»"']/.test(char)) {
      if (currentWord.trim().length > 0) {
        tokens.push({ word: currentWord, start: wordStart, end: i });
      }
      currentWord = '';
      wordStart = -1;
    } else {
      if (currentWord.length === 0) wordStart = i;
      currentWord += char;
    }
  }
  if (currentWord.trim().length > 0) {
    tokens.push({ word: currentWord, start: wordStart, end: htmlStr.length });
  }
  return tokens;
}

export async function analyzeText(html: string): Promise<{ html: string; issues: ComplianceIssue[] }> {
  // 1. Apply Style Enhancements (Opinion boxes, Questions, etc.)
  let processedHtml = enhanceStyles(html);
  
  // 2. Quran Verse Detection & Replacement
  const surahNamesRegexPart = SURAH_NAMES.map(s => {
    const norm = normalizeText(s);
    const withoutAl = norm.replace(/^ال/, '');
    return `(?:${norm}|${withoutAl})`;
  }).join('|');

  // Pattern to find references in various formats:
  // - [123] or (123)
  // - [Surah : 123]
  // - Surah 123
  const pattern = new RegExp(
    `(` +
      // Case A: Bracketed (Surah name optional inside or before)
      `[\\(\\[\\{﴿][^\\)\\]\\}﴾]*?(\\d+|[\\u0660-\u0669]+)(?:\\s*[:\\-]\\s*(\\d+|[\\u0660-\u0669]+))?[^\\)\\]\\}﴾]*?[\\)\\]\\}﴾]` +
      `|` +
      // Case B: Unbracketed (Surah name mandatory before)
      `(?:سورة\\s+)?(${surahNamesRegexPart})\\s+(\\d+|[\\u0660-\u0669]+)(?:\\s*[:\\-]\\s*(\\d+|[\\u0660-\u0669]+))?` +
    `)`,
    'g'
  );
  
  let match;
  const matches = [];
  while ((match = pattern.exec(processedHtml)) !== null) {
    let num1Str = '';
    let num2Str = '';
    let surahNameInMatch = '';

    if (match[2]) { // Case A (Bracketed)
      num1Str = match[2];
      num2Str = match[3] || '';
      // Check if surah name is inside the brackets
      const inside = match[0];
      const sIndex = SURAH_NAMES.findIndex(name => {
        const normName = normalizeText(name);
        const withoutAl = normName.replace(/^ال/, '');
        return inside.includes(normName) || inside.includes(withoutAl);
      });
      if (sIndex !== -1) surahNameInMatch = SURAH_NAMES[sIndex];
    } else { // Case B (Unbracketed)
      surahNameInMatch = match[4];
      num1Str = match[5];
      num2Str = match[6] || '';
    }

    matches.push({
      fullMatch: match[0],
      num1Str,
      num2Str,
      surahNameInMatch,
      index: match.index,
      length: match[0].length
    });
  }
  
  matches.reverse();
  
  for (const m of matches) {
    const num1 = parseInt(convertArabicDigitsToEnglish(m.num1Str));
    const num2 = m.num2Str ? parseInt(convertArabicDigitsToEnglish(m.num2Str)) : null;
    
    let surahNum = null;
    let ayahNum = null;
    
    if (m.surahNameInMatch) {
      const sIndex = SURAH_NAMES.findIndex(n => n === m.surahNameInMatch);
      if (sIndex !== -1) {
        surahNum = sIndex + 1;
        ayahNum = num2 !== null ? num2 : num1;
      }
    } else if (num2 !== null) {
      surahNum = num1;
      ayahNum = num2;
    } else {
      ayahNum = num1;
    }
    
    // Get context before the match (up to 1000 chars)
    const contextEndIndex = m.index;
    const contextStartIndex = Math.max(0, m.index - 1000);
    const rawContext = processedHtml.substring(contextStartIndex, contextEndIndex);
    
    const cleanContext = rawContext.replace(/<[^>]+>/g, ' ');
    const words = cleanContext.trim().split(/\s+/);

    // Try to find surah name in context if not explicitly provided
    if (surahNum === null && words.length > 0) {
      for (let i = 1; i <= 4; i++) {
        if (words.length >= i) {
          const possibleName = normalizeText(words.slice(-i).join(' '));
          const normPossible = possibleName.replace(/^سوره\s+/, '');
          const sIndex = SURAH_NAMES.findIndex(name => {
            const normName = normalizeText(name);
            return normName === normPossible || normName.replace(/^ال/, '') === normPossible || normPossible.replace(/^ال/, '') === normName;
          });
          if (sIndex !== -1) {
            surahNum = sIndex + 1;
            break;
          }
        }
      }
    }
    
    let foundVerse = null;
    
    if (surahNum) {
       foundVerse = db.prepare('SELECT * FROM quran WHERE surah = ? AND ayah = ?').get(surahNum, ayahNum);
    } else {
       if (words.length === 0) continue;
       
       const lastWord = normalizeText(words[words.length - 1]);
       // Ignore very short words (like 'و') as they are too common to be reliable identifiers
       if (!lastWord || lastWord.length < 2) continue;
       
       let candidates = db.prepare(`
         SELECT * FROM quran 
         WHERE ayah = ? 
         AND text_clean LIKE ?
       `).all(ayahNum, '%' + lastWord);
       
       if (candidates.length === 0) {
         const queryText = words.slice(-5).join(' ');
         const onlineMatch = await searchQuranDotCom(queryText, ayahNum);
         if (onlineMatch) {
           candidates = [onlineMatch];
         }
       }
   
       if (candidates.length > 1 && words.length >= 2) {
         const secondLast = normalizeText(words[words.length - 2]);
         if (secondLast) {
           candidates = candidates.filter((c: any) => normalizeText(c.text_clean).includes(secondLast));
         }
       }
       
       if (candidates.length > 1 && words.length >= 3) {
         const thirdLast = normalizeText(words[words.length - 3]);
         if (thirdLast) {
           candidates = candidates.filter((c: any) => normalizeText(c.text_clean).includes(thirdLast));
         }
       }
       
       if (candidates.length > 1) {
          const contextAfterStart = m.index + m.length;
          const contextAfterEnd = Math.min(processedHtml.length, contextAfterStart + 100);
          const rawContextAfter = processedHtml.substring(contextAfterStart, contextAfterEnd);
          const cleanContextAfter = rawContextAfter.replace(/<[^>]+>/g, ' ');
          const wordsAfter = cleanContextAfter.trim().split(/\s+/);
          
          if (wordsAfter.length > 0) {
            const firstNextWord = normalizeText(wordsAfter[0]);
            if (firstNextWord) {
              const resolvedCandidates = [];
              for (const cand of candidates) {
                const nextVerse = db.prepare('SELECT text_clean FROM quran WHERE surah = ? AND ayah = ?').get(cand.surah, cand.ayah + 1);
                if (nextVerse && normalizeText((nextVerse as any).text_clean).startsWith(firstNextWord)) {
                  resolvedCandidates.push(cand);
                }
              }
              if (resolvedCandidates.length > 0) {
                candidates = resolvedCandidates;
              }
            }
          }
       }
       
       if (candidates.length > 0) {
         foundVerse = candidates[0];
       }
    }
    
    if (foundVerse) {
      const verseClean = normalizeText((foundVerse as any).text_clean);
      const verseWords = verseClean.split(' ');
      
      let matchCount = 0;
      let lastMatchedIndex = -1;
      
      const tokens = tokenizeHTML(rawContext);
      let tokenIndex = tokens.length - 1;
      let startOfVerseIndex = -1;
      
      let mismatches = 0;
      let currentDbIndex = verseWords.length - 1;
      
      while (tokenIndex >= 0 && currentDbIndex >= 0 && mismatches < 10) {
        const userToken = tokens[tokenIndex];
        const userWordNorm = normalizeText(userToken.word);
        
        if (!userWordNorm) {
           tokenIndex--;
           continue;
        }
        
        let matched = false;
        // Look ahead in DB words (up to 3 words) to allow for missing user words
        for (let offset = 0; offset < 3 && currentDbIndex - offset >= 0; offset++) {
          const dbWord = verseWords[currentDbIndex - offset];
          if (userWordNorm === dbWord || dbWord.includes(userWordNorm) || userWordNorm.includes(dbWord)) {
            matched = true;
            matchCount++;
            lastMatchedIndex = userToken.start;
            currentDbIndex = currentDbIndex - offset - 1;
            break;
          }
        }
        
        if (matched) {
          mismatches = 0; // Reset mismatches on match
        } else {
          mismatches++;
        }
        
        tokenIndex--;
      }
      
      if (matchCount > 0) {
         startOfVerseIndex = lastMatchedIndex;
      } else {
         startOfVerseIndex = -1;
      }

      // SAFETY CHECK: If we didn't find any matching words in the context AND the surah wasn't explicitly provided,
      // it's highly likely a false positive (like a list item (1), (2), etc.)
      if (startOfVerseIndex === -1 && surahNum === null) {
        continue;
      }

      const surahName = SURAH_NAMES[(foundVerse as any).surah - 1] || (foundVerse as any).surah;
      const verseRef = `سورة ${surahName} : ${(foundVerse as any).ayah}`;
      const replacement = `
<span class="quran-verse" style="display: block;" data-surah="${(foundVerse as any).surah}" data-ayah="${(foundVerse as any).ayah}">
  ${cleanUthmani((foundVerse as any).text_uthmani)}
  <br>
  <a href="https://quran.com/${(foundVerse as any).surah}/${(foundVerse as any).ayah}" class="verse-ref" target="_blank">[${verseRef}]</a>
</span>`;

      if (startOfVerseIndex !== -1) {
        const absoluteStart = contextStartIndex + startOfVerseIndex;
        const absoluteEnd = m.index + m.length;
        processedHtml = replaceWithTagBalancing(processedHtml, absoluteStart, absoluteEnd, replacement);
      } else {
        // This case only happens if surahNum was explicitly provided but context matching failed
        const absoluteStart = m.index;
        const absoluteEnd = m.index + m.length;
        processedHtml = replaceWithTagBalancing(processedHtml, absoluteStart, absoluteEnd, replacement);
      }
    }
  }
  
  // 2.5 Merge consecutive verses
  let merged = true;
  while (merged) {
    merged = false;
    const $ = load(processedHtml, null, false);
    const verses = $('.quran-verse').toArray();
    
    for (let i = 0; i < verses.length - 1; i++) {
      const v1 = $(verses[i]);
      const v2 = $(verses[i+1]);
      
      const surah1 = parseInt(v1.attr('data-surah') || '0');
      const ayah1 = v1.attr('data-ayah') || '';
      const surah2 = parseInt(v2.attr('data-surah') || '0');
      const ayah2 = v2.attr('data-ayah') || '';
      
      const firstAyah1 = parseInt(ayah1.split('-')[0] || '0');
      const lastAyah1 = parseInt(ayah1.split('-').pop() || '0');
      const firstAyah2 = parseInt(ayah2.split('-')[0] || '0');
      const lastAyah2 = parseInt(ayah2.split('-').pop() || '0');
      
      if (surah1 === surah2 && lastAyah1 + 1 === firstAyah2) {
        const v1Html = $.html(v1);
        const v2Html = $.html(v2);
        
        const idx1 = processedHtml.indexOf(v1Html);
        const idx2 = processedHtml.indexOf(v2Html, idx1 + v1Html.length);
        
        if (idx1 !== -1 && idx2 !== -1) {
          const between = processedHtml.substring(idx1 + v1Html.length, idx2);
          const textBetween = between.replace(/<[^>]+>/g, '').trim();
          
          // Only merge if there's no significant text between them
          if (!/[a-zA-Z\u0600-\u06FF0-9]/.test(textBetween)) {
            const surahName = SURAH_NAMES[surah1 - 1] || surah1.toString();
            const newAyahRange = `${firstAyah1}-${lastAyah2}`;
            
            const versesInDb = db.prepare('SELECT ayah, text_uthmani FROM quran WHERE surah = ? AND ayah >= ? AND ayah <= ? ORDER BY ayah ASC').all(surah1, firstAyah1, lastAyah2);
            
            let combinedText = '';
            for (let j = 0; j < versesInDb.length; j++) {
              const v = versesInDb[j] as any;
              combinedText += cleanUthmani(v.text_uthmani);
              if (j < versesInDb.length - 1) {
                combinedText += ' ﴿' + convertEnglishDigitsToArabic(v.ayah.toString()) + '﴾ ';
              }
            }
            
            const replacement = `
<span class="quran-verse" style="display: block;" data-surah="${surah1}" data-ayah="${newAyahRange}">
  ${combinedText}
  <br>
  <a href="https://quran.com/${surah1}/${newAyahRange}" class="verse-ref" target="_blank">[سورة ${surahName} : ${newAyahRange}]</a>
</span>`;
            
            processedHtml = replaceWithTagBalancing(processedHtml, idx1, idx2 + v2Html.length, replacement);
            merged = true;
            break;
          }
        }
      }
    }
  }
  
  // Clean up empty tags
  let previousHtml;
  do {
    previousHtml = processedHtml;
    processedHtml = processedHtml.replace(/<(p|strong|em|span|div|b|i)[^>]*>\s*<\/\1>/gi, '');
  } while (processedHtml !== previousHtml);
  
  // 3. Compliance Check
  const issues = checkCompliance(processedHtml);
  
  return { html: processedHtml, issues };
}
