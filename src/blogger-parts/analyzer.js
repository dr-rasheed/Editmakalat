            const analyzeArticle = async (html) => {
                let processedHtml = html;
                
                const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
                    for (let i = 0; i < retries; i++) {
                        try {
                            const res = await fetch(url);
                            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                            return await res.json();
                        } catch (e) {
                            if (i === retries - 1) throw e;
                            await new Promise(resolve => setTimeout(resolve, delay));
                            delay *= 2;
                        }
                    }
                };

                const surahNamesRegexPart = SURAH_NAMES.map(s => {
                    const norm = normalizeText(s);
                    const withoutAl = norm.replace(/^ال/, '');
                    return `(?:${norm}|${withoutAl})`;
                }).join('|');

                // Pattern to find references
                // We limit the content inside brackets to avoid matching long text or unclosed brackets
                // Max ~50 chars before the number inside brackets
                const refPatternSource = 
                    `(` +
                    `[\\(\\[\\{﴿](?:[^\\)\\]\\}﴾]{0,50}?)(\\d+|[\\u0660-\\u0669]+)(?:\\s*([:\\-])\\s*(\\d+|[\\u0660-\\u0669]+))?[^\\)\\]\\}﴾]*?[\\)\\]\\}﴾]` +
                    `|` +
                    `(?:سورة\\s+)?(${surahNamesRegexPart})\\s+(\\d+|[\\u0660-\\u0669]+)(?:\\s*([:\\-])\\s*(\\d+|[\\u0660-\\u0669]+))?` +
                    `)`;

                // Regex that matches EITHER an HTML tag OR our pattern
                const combinedPattern = new RegExp(`(<[^>]+>)|${refPatternSource}`, 'g');

                let match;
                const matches = [];
                while ((match = combinedPattern.exec(processedHtml)) !== null) {
                    if (match[1]) continue; // It's an HTML tag, skip it

                    // Determine which groups matched based on the offset of the combined pattern
                    let num1Str = match[3] || match[7] || '';
                    let sepStr = match[4] || match[8] || '';
                    let num2Str = match[5] || match[9] || '';
                    let surahNameInMatch = '';

                    if (match[3]) { // Bracketed case
                        const inside = match[2];
                        const sIndex = SURAH_NAMES.findIndex(name => {
                            const normName = normalizeText(name);
                            const withoutAl = normName.replace(/^ال/, '');
                            return inside.includes(normName) || inside.includes(withoutAl);
                        });
                        if (sIndex !== -1) surahNameInMatch = SURAH_NAMES[sIndex];
                    } else {
                        surahNameInMatch = match[6];
                    }

                    const num1 = parseInt(convertArabicDigitsToEnglish(num1Str));
                    const num2 = num2Str ? parseInt(convertArabicDigitsToEnglish(num2Str)) : null;
                    
                    let surahNum = null;
                    let ayahNum = null;
                    let ayahNumStart = null;
                    
                    if (surahNameInMatch) {
                        const sIndex = SURAH_NAMES.findIndex(n => n === surahNameInMatch);
                        if (sIndex !== -1) {
                            surahNum = sIndex + 1;
                            if (num2 !== null && sepStr === '-') {
                                ayahNumStart = num1;
                                ayahNum = num2;
                            } else {
                                ayahNumStart = num2 !== null ? num2 : num1;
                                ayahNum = num2 !== null ? num2 : num1;
                            }
                        }
                    } else if (num2 !== null) {
                        if (sepStr === ':') {
                            surahNum = num1;
                            ayahNumStart = num2;
                            ayahNum = num2;
                        } else if (sepStr === '-') {
                            ayahNumStart = num1;
                            ayahNum = num2;
                        }
                    } else {
                        ayahNumStart = num1;
                        ayahNum = num1;
                    }

                    // Look backwards to see if we are inside a link or sup tag that we should include in the match
                    let matchStartIndex = match.index;
                    let matchEndIndex = match.index + match[0].length;
                    
                    const beforeMatch = processedHtml.substring(Math.max(0, matchStartIndex - 50), matchStartIndex);
                    const afterMatch = processedHtml.substring(matchEndIndex, Math.min(processedHtml.length, matchEndIndex + 50));
                    
                    // Check for <a> tag wrapper
                    if (beforeMatch.match(/<a[^>]*>$/i) && afterMatch.match(/^<\/a>/i)) {
                        const aStart = beforeMatch.match(/<a[^>]*>$/i)[0];
                        const aEnd = afterMatch.match(/^<\/a>/i)[0];
                        matchStartIndex -= aStart.length;
                        matchEndIndex += aEnd.length;
                    }
                    // Check for <sup> tag wrapper
                    else if (beforeMatch.match(/<sup[^>]*>$/i) && afterMatch.match(/^<\/sup>/i)) {
                        const supStart = beforeMatch.match(/<sup[^>]*>$/i)[0];
                        const supEnd = afterMatch.match(/^<\/sup>/i)[0];
                        matchStartIndex -= supStart.length;
                        matchEndIndex += supEnd.length;
                    }

                    matches.push({
                        fullMatch: match[0],
                        index: matchStartIndex,
                        length: matchEndIndex - matchStartIndex,
                        surahNum,
                        ayahNumStart,
                        ayahNum
                    });
                }

                const replacements = [];
                
                for (const m of matches) {
                    if (!m.surahNum && m.ayahNum) {
                        // Try to find the Surah using the preceding text
                        const precedingText = processedHtml.substring(Math.max(0, m.index - 150), m.index);
                        // For search, we just remove HTML tags and extra spaces, keeping Arabic letters
                        const cleanPreceding = precedingText.replace(/<[^>]+>/g, ' ').replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
                        const wordsArr = cleanPreceding.split(' ');
                        
                        const trySearch = async (wordCount) => {
                            const wordsToSearch = wordsArr.slice(Math.max(0, wordsArr.length - wordCount)).join(' ');
                            if (wordsToSearch.length > 5) {
                                try {
                                    const searchUrl = `https://api.quran.com/api/v4/search?q=${encodeURIComponent(wordsToSearch)}&size=20`;
                                    const searchRes = await fetchWithRetry(searchUrl);
                                    if (searchRes && searchRes.search && searchRes.search.results) {
                                        // Find a match that fits the verse number criteria AND matches the text content
                                        const match = searchRes.search.results.find(r => {
                                            const parts = r.verse_key.split(':');
                                            const vNum = parseInt(parts[1]);
                                            
                                            // 1. Check if verse number is within range
                                            if (vNum < m.ayahNumStart || vNum > m.ayahNum) return false;

                                            // 2. Validate text content to avoid false positives
                                            // The API returns 'text' which is the verse text.
                                            // We check if at least some of our search words are actually in the verse text.
                                            if (r.text) {
                                                const normVerse = normalizeText(r.text);
                                                const normSearch = normalizeText(wordsToSearch);
                                                const searchWords = normSearch.split(' ').filter(w => w.length > 2); // Filter small words
                                                
                                                if (searchWords.length === 0) return true; // Fallback if only small words

                                                let matchedWords = 0;
                                                for (const w of searchWords) {
                                                    if (normVerse.includes(w)) matchedWords++;
                                                }

                                                // Require at least 50% of significant words to match
                                                return (matchedWords / searchWords.length) >= 0.5;
                                            }
                                            
                                            return true; // If no text returned, fallback to just number match (risky but rare)
                                        });

                                        if (match) {
                                            const parts = match.verse_key.split(':');
                                            m.surahNum = parseInt(parts[0]);
                                            m.guessedSurah = true;
                                            return true;
                                        }
                                    }
                                } catch (e) {
                                    console.error("Search API Error:", e);
                                }
                            }
                            return false;
                        };

                        // Try with 8 words, then 5, then 3
                        let found = await trySearch(8);
                        if (!found) found = await trySearch(5);
                        if (!found) await trySearch(3);
                    }

                    if (!m.surahNum || !m.ayahNum) continue;

                    try {
                        const maxAyahs = Math.min(m.ayahNum - m.ayahNumStart + 1, 10);
                        let verseTextClean = '';
                        let uthmaniText = '';
                        
                        for (let i = 0; i < maxAyahs; i++) {
                            const a = m.ayahNumStart + i;
                            const data = await fetchWithRetry(`https://api.alquran.cloud/v1/ayah/${m.surahNum}:${a}/quran-simple-clean`);
                            if (data && data.code === 200) {
                                verseTextClean += (verseTextClean ? ' ' : '') + normalizeText(data.data.text);
                            }
                            const uthmaniData = await fetchWithRetry(`https://api.alquran.cloud/v1/ayah/${m.surahNum}:${a}/quran-uthmani`);
                            if (uthmaniData && uthmaniData.code === 200) {
                                uthmaniText += (uthmaniText ? ' ۝ ' : '') + cleanUthmani(uthmaniData.data.text);
                            }
                        }
                        
                        if (verseTextClean && uthmaniText) {
                            const verseWords = verseTextClean.split(' ');

                            const contextStartIndex = Math.max(0, m.index - 1500);
                            const rawContext = processedHtml.substring(contextStartIndex, m.index);
                            
                            let startOfVerseIndex = -1;
                            
                            // Create a map of clean text to original HTML to find the exact start index
                            let cleanContext = '';
                            const indexMap = []; // Maps cleanContext index to rawContext index
                            
                            let inTag = false;
                            for (let i = 0; i < rawContext.length; i++) {
                                if (rawContext[i] === '<') inTag = true;
                                
                                if (!inTag) {
                                    cleanContext += rawContext[i];
                                    indexMap.push(i);
                                }
                                
                                if (rawContext[i] === '>') inTag = false;
                            }

                            const contextTokens = cleanContext.split(/(\s+|[()\[\]{}﴿﴾«»"':\-,.!؟،؛*_])/);
                            let currentDbIndex = verseWords.length - 1;
                            let mismatches = 0;
                            
                            // We need to track the character position in cleanContext
                            let currentCleanCharPos = cleanContext.length;
                            
                            for (let i = contextTokens.length - 1; i >= 0 && currentDbIndex >= 0 && mismatches < 15; i--) {
                                const token = contextTokens[i];
                                currentCleanCharPos -= token.length;
                                
                                const normToken = normalizeText(token);
                                if (!normToken) continue;

                                let matched = false;
                                for (let offset = 0; offset < 4 && currentDbIndex - offset >= 0; offset++) {
                                    const dbWord = verseWords[currentDbIndex - offset];
                                    if (normToken === dbWord || dbWord.includes(normToken) || normToken.includes(dbWord)) {
                                        matched = true;
                                        currentDbIndex = currentDbIndex - offset - 1;
                                        break;
                                    }
                                }

                                if (matched) {
                                    mismatches = 0;
                                    // Map the clean character position back to the raw HTML position
                                    if (currentCleanCharPos >= 0 && currentCleanCharPos < indexMap.length) {
                                        startOfVerseIndex = indexMap[currentCleanCharPos];
                                    }
                                } else {
                                    mismatches++;
                                }
                            }

                            if (startOfVerseIndex === -1 && m.guessedSurah) {
                                console.warn("Guessed Surah but couldn't find verse text, skipping.");
                                continue;
                            }

                            const surahName = SURAH_NAMES[m.surahNum - 1];
                            const ayahDisplay = m.ayahNumStart !== m.ayahNum ? `${m.ayahNumStart}-${m.ayahNum}` : m.ayahNum;
                            const replacementHtml = `
<div class="quran-verse" dir="rtl">
    ${uthmaniText}
    <a href="https://quran.com/${m.surahNum}/${m.ayahNumStart}" class="verse-ref" target="_blank">[سورة ${surahName} : ${ayahDisplay}]</a>
</div>`;
                            
                            let absoluteStart = startOfVerseIndex !== -1 ? contextStartIndex + startOfVerseIndex : m.index;
                            let absoluteEnd = m.index + m.length;

                            // Safety check: Expand to include surrounding tags if we split them
                            const beforeStart = processedHtml.substring(Math.max(0, absoluteStart - 30), absoluteStart);
                            if (beforeStart.match(/<(strong|b|p|span|div)[^>]*>$/i)) {
                                const tagMatch = beforeStart.match(/<(strong|b|p|span|div)[^>]*>$/i);
                                absoluteStart -= tagMatch[0].length;
                            }
                            
                            const afterEnd = processedHtml.substring(absoluteEnd, Math.min(processedHtml.length, absoluteEnd + 30));
                            if (afterEnd.match(/^<\/(strong|b|p|span|div)>/i)) {
                                const tagMatch = afterEnd.match(/^<\/(strong|b|p|span|div)>/i);
                                absoluteEnd += tagMatch[0].length;
                            }

                            // Balance tags to prevent breaking the rest of the page
                            const replacedText = processedHtml.substring(absoluteStart, absoluteEnd);
                            const tags = [...replacedText.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi)];
                            const openTags = [];
                            let prependTags = '';
                            let appendTags = '';

                            for (const tag of tags) {
                                const isClosing = tag[0].startsWith('</');
                                const tagName = tag[1].toLowerCase();
                                if (['br', 'hr', 'img', 'input', 'meta'].includes(tagName)) continue;

                                if (isClosing) {
                                    const lastOpen = openTags.lastIndexOf(tagName);
                                    if (lastOpen !== -1) {
                                        openTags.splice(lastOpen, 1);
                                    } else {
                                        // Unmatched closing tag. The opening tag is before absoluteStart.
                                        // We must close it before our replacement box.
                                        prependTags += `</${tagName}>`;
                                    }
                                } else {
                                    openTags.push(tagName);
                                }
                            }

                            // Any remaining openTags are unmatched opening tags.
                            // The closing tag is after absoluteEnd.
                            // We must reopen them after our replacement box.
                            for (const tagName of openTags) {
                                appendTags += `<${tagName}>`;
                            }

                            replacements.push({
                                start: absoluteStart,
                                end: absoluteEnd,
                                content: prependTags + replacementHtml + appendTags
                            });
                        }
                    } catch (e) {
                        console.error("API Error:", e);
                    }
                }

                replacements.sort((a, b) => b.start - a.start);

                let lastStart = Infinity;
                for (const r of replacements) {
                    if (r.end > lastStart) continue;
                    processedHtml = processedHtml.substring(0, r.start) + r.content + processedHtml.substring(r.end);
                    lastStart = r.start;
                }

                return processedHtml;
            };
