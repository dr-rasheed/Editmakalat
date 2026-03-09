        function normalizeText(text) {
            if (!text) return '';
            let normalized = text
                .replace(/\u0670/g, 'ا')
                .replace(/\u06E5/g, 'ي')
                .replace(/\u06E6/g, 'و')
                .replace(/\u0671/g, 'ا')
                .replace(/\u06CC/g, 'ي')
                .replace(/\u06C1/g, 'ه');
            
            let result = normalized
                .replace(/(آ|إ|أ|ٱ)/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/ؤ/g, 'و')
                .replace(/ئ/g, 'ي')
                .replace(/ء/g, '');

            result = result.replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06ED]/g, '');
            result = result.replace(/[^\u0621-\u064A\s]/g, '');
            return result.replace(/\s+/g, ' ').trim();
        }

        function cleanUthmani(text) {
            if (!text) return '';
            return text.replace(/\u0640/g, '');
        }

        function convertArabicDigitsToEnglish(str) {
            return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
        }
