const balanceHtmlTags = (processedHtml, absoluteStart, absoluteEnd) => {
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
                prependTags += `</${tagName}>`;
            }
        } else {
            openTags.push(tagName);
        }
    }

    for (const tagName of openTags) {
        appendTags += `<${tagName}>`;
    }

    return { prependTags, appendTags };
};

const expandToIncludeSurroundingTags = (processedHtml, absoluteStart, absoluteEnd) => {
    let newStart = absoluteStart;
    let newEnd = absoluteEnd;

    const beforeStart = processedHtml.substring(Math.max(0, newStart - 30), newStart);
    if (beforeStart.match(/<(strong|b|p|span|div)[^>]*>$/i)) {
        const tagMatch = beforeStart.match(/<(strong|b|p|span|div)[^>]*>$/i);
        newStart -= tagMatch[0].length;
    }
    
    const afterEnd = processedHtml.substring(newEnd, Math.min(processedHtml.length, newEnd + 30));
    if (afterEnd.match(/^<\/(strong|b|p|span|div)>/i)) {
        const tagMatch = afterEnd.match(/^<\/(strong|b|p|span|div)>/i);
        newEnd += tagMatch[0].length;
    }

    return { absoluteStart: newStart, absoluteEnd: newEnd };
};

const findVerseStartIndex = (verseWords, rawContext, normalizeText) => {
    let startOfVerseIndex = -1;
    let cleanContext = '';
    const indexMap = [];
    
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
            if (currentCleanCharPos >= 0 && currentCleanCharPos < indexMap.length) {
                startOfVerseIndex = indexMap[currentCleanCharPos];
            }
        } else {
            mismatches++;
        }
    }

    return startOfVerseIndex;
};
