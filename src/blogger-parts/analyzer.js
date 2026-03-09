            const analyzeArticle = async (html, onProgress) => {
                let processedHtml = html;
                
                if (onProgress) onProgress(5, "جاري البحث عن الآيات في النص...");
                const combinedPattern = getCombinedPattern(SURAH_NAMES, normalizeText);

                let match;
                const matches = [];
                while ((match = combinedPattern.exec(processedHtml)) !== null) {
                    if (match[1]) continue; // It's an HTML tag, skip it

                    const { surahNum, ayahNumStart, ayahNum } = extractMatchDetails(match, SURAH_NAMES, normalizeText, convertArabicDigitsToEnglish);

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

                if (onProgress) onProgress(10, `تم العثور على ${matches.length} إشارة محتملة لآيات.`);

                const replacements = [];
                
                for (let i = 0; i < matches.length; i++) {
                    const m = matches[i];
                    const progressPercent = 10 + Math.floor((i / matches.length) * 80);

                    if (!m.surahNum && m.ayahNum) {
                        if (onProgress) onProgress(progressPercent, `جاري تخمين السورة للآية رقم ${m.ayahNum}...`);
                        // Try to find the Surah using the preceding text
                        const precedingText = processedHtml.substring(Math.max(0, m.index - 150), m.index);
                        // For search, we just remove HTML tags and extra spaces, keeping Arabic letters
                        const cleanPreceding = precedingText.replace(/<[^>]+>/g, ' ').replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
                        const wordsArr = cleanPreceding.split(' ');
                        
                        // Try with 8 words, then 5, then 3
                        let found = await searchVerseByWords(wordsArr, 8, m, normalizeText, fetchWithRetry);
                        if (!found) found = await searchVerseByWords(wordsArr, 5, m, normalizeText, fetchWithRetry);
                        if (!found) await searchVerseByWords(wordsArr, 3, m, normalizeText, fetchWithRetry);
                    }

                    if (!m.surahNum || !m.ayahNum) continue;

                    try {
                        const surahName = SURAH_NAMES[m.surahNum - 1];
                        const ayahDisplay = m.ayahNumStart !== m.ayahNum ? `${m.ayahNumStart}-${m.ayahNum}` : m.ayahNum;
                        if (onProgress) onProgress(progressPercent, `جاري معالجة سورة ${surahName} الآية ${ayahDisplay}...`);

                        const maxAyahs = Math.min(m.ayahNum - m.ayahNumStart + 1, 10);
                        let verseTextClean = '';
                        let uthmaniText = '';
                        
                        for (let j = 0; j < maxAyahs; j++) {
                            const a = m.ayahNumStart + j;
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
                            
                            const startOfVerseIndex = findVerseStartIndex(verseWords, rawContext, normalizeText);

                            if (startOfVerseIndex === -1 && m.guessedSurah) {
                                console.warn("Guessed Surah but couldn't find verse text, skipping.");
                                continue;
                            }

                            const replacementHtml = `\n<div class="quran-verse" dir="rtl">\n    ${uthmaniText}\n    <a href="https://quran.com/${m.surahNum}/${m.ayahNumStart}" class="verse-ref" target="_blank">[سورة ${surahName} : ${ayahDisplay}]</a>\n</div>`;
                            
                            let absoluteStart = startOfVerseIndex !== -1 ? contextStartIndex + startOfVerseIndex : m.index;
                            let absoluteEnd = m.index + m.length;

                            const expanded = expandToIncludeSurroundingTags(processedHtml, absoluteStart, absoluteEnd);
                            absoluteStart = expanded.absoluteStart;
                            absoluteEnd = expanded.absoluteEnd;

                            const { prependTags, appendTags } = balanceHtmlTags(processedHtml, absoluteStart, absoluteEnd);

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

                if (onProgress) onProgress(95, "جاري استبدال النصوص وتنسيق الآيات...");
                replacements.sort((a, b) => b.start - a.start);

                let lastStart = Infinity;
                for (const r of replacements) {
                    if (r.end > lastStart) continue;
                    processedHtml = processedHtml.substring(0, r.start) + r.content + processedHtml.substring(r.end);
                    lastStart = r.start;
                }

                if (onProgress) onProgress(100, "اكتملت المعالجة بنجاح.");
                return processedHtml;
            };
