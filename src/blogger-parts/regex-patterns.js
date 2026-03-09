const getCombinedPattern = (SURAH_NAMES, normalizeText) => {
    const surahNamesRegexPart = SURAH_NAMES.map(s => {
        const norm = normalizeText(s);
        const withoutAl = norm.replace(/^ال/, '');
        return `(?:${norm}|${withoutAl})`;
    }).join('|');

    const refPatternSource = 
        `(` +
        `[\\(\\[\\{﴿](?:[^\\)\\]\\}﴾]{0,50}?)(\\d+|[\\u0660-\\u0669]+)(?:\\s*([:\\-])\\s*(\\d+|[\\u0660-\\u0669]+))?[^\\)\\]\\}﴾]*?[\\)\\]\\}﴾]` +
        `|` +
        `(?:سورة\\s+)?(${surahNamesRegexPart})\\s+(\\d+|[\\u0660-\\u0669]+)(?:\\s*([:\\-])\\s*(\\d+|[\\u0660-\\u0669]+))?` +
        `)`;

    return new RegExp(`(<[^>]+>)|${refPatternSource}`, 'g');
};

const extractMatchDetails = (match, SURAH_NAMES, normalizeText, convertArabicDigitsToEnglish) => {
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

    return { surahNum, ayahNumStart, ayahNum };
};
