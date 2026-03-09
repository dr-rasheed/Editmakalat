        function normalizeText(text) {
            if (!text) return '';
            
            // Remove Tatweel (Kashida)
            let normalized = text.replace(/\u0640/g, '');
            
            // Normalize Aleph variants to bare Aleph
            normalized = normalized.replace(/[أإآٱ]/g, 'ا');
            
            // Normalize Ya/Aleph Maqsura to Ya
            normalized = normalized.replace(/[ىي]/g, 'ي');
            
            // Normalize Ta Marbuta to Ha
            normalized = normalized.replace(/ة/g, 'ه');
            
            // Normalize Waw variants
            normalized = normalized.replace(/[ؤ]/g, 'و');
            normalized = normalized.replace(/[ئ]/g, 'ي');
            
            // Remove Diacritics (Tashkeel) including Dagger Alif (\u0670) and others
            // We remove them instead of replacing to avoid breaking words like Allah (اللّٰه -> الله)
            normalized = normalized.replace(/[\u064B-\u065F\u0670\u0610-\u061A\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06ED]/g, '');
            
            // Remove Hamza if standalone (optional, but sometimes helps)
            normalized = normalized.replace(/ء/g, '');

            // Keep only Arabic letters and spaces
            normalized = normalized.replace(/[^\u0621-\u064A\s]/g, '');
            
            return normalized.replace(/\s+/g, ' ').trim();
        }

        function cleanUthmani(text) {
            if (!text) return '';
            return text.replace(/\u0640/g, '');
        }

        function convertArabicDigitsToEnglish(str) {
            return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
        }
