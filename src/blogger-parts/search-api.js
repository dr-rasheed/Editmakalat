const searchVerseByWords = async (wordsArr, wordCount, m, normalizeText, fetchWithRetry) => {
    const wordsToSearch = wordsArr.slice(Math.max(0, wordsArr.length - wordCount)).join(' ');
    if (wordsToSearch.length < 5) return false;

    // Strategy 1: Try Quran.com Search API
    try {
        const searchUrl = `https://api.quran.com/api/v4/search?q=${encodeURIComponent(wordsToSearch)}&size=20`;
        const searchRes = await fetchWithRetry(searchUrl);
        if (searchRes && searchRes.search && searchRes.search.results) {
            const match = searchRes.search.results.find(r => {
                const parts = r.verse_key.split(':');
                const vNum = parseInt(parts[1]);
                
                if (vNum < m.ayahNumStart || vNum > m.ayahNum) return false;

                if (r.text) {
                    const normVerse = normalizeText(r.text);
                    const normSearch = normalizeText(wordsToSearch);
                    const searchWords = normSearch.split(' ').filter(w => w.length >= 2);
                    
                    if (searchWords.length === 0) return true; 

                    let matchedWords = 0;
                    for (const w of searchWords) {
                        if (normVerse.includes(w)) matchedWords++;
                    }

                    if (searchWords.length > 3) {
                        return (matchedWords / searchWords.length) >= 0.4;
                    } else {
                        return matchedWords >= 1;
                    }
                }
                return true;
            });

            if (match) {
                const parts = match.verse_key.split(':');
                m.surahNum = parseInt(parts[0]);
                m.guessedSurah = true;
                return true;
            }
        }
    } catch (e) {
        console.error("Quran.com Search API Error:", e);
    }

    // Strategy 2: Try AlQuran.cloud Search API (Fallback)
    try {
        const searchUrl = `https://api.alquran.cloud/v1/search/${encodeURIComponent(wordsToSearch)}/all/quran-simple-clean`;
        const searchRes = await fetchWithRetry(searchUrl);
        if (searchRes && searchRes.code === 200 && searchRes.data && searchRes.data.matches) {
            const match = searchRes.data.matches.find(r => {
                const vNum = r.numberInSurah;
                // Check verse number match
                if (vNum < m.ayahNumStart || vNum > m.ayahNum) return false;
                return true; // AlQuran.cloud returns exact matches usually, so we trust it if number matches
            });

            if (match) {
                m.surahNum = match.surah.number;
                m.guessedSurah = true;
                return true;
            }
        }
    } catch (e) {
        console.error("AlQuran.cloud Search API Error:", e);
    }

    return false;
};
