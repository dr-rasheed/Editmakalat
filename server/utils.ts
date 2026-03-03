export function normalizeText(text: string): string {
  if (!text) return '';
  
  // 1. Map specific Quranic small letters to their full equivalents BEFORE stripping
  // This ensures that "النبيۦن" matches "النبيين"
  let normalized = text
    .replace(/\u0670/g, 'ا') // Alef Khanjariya -> Alef
    .replace(/\u06E5/g, 'ي') // Small Ya -> Ya
    .replace(/\u06E6/g, 'و') // Small Waw -> Waw
    .replace(/\u0671/g, 'ا') // Alef Wasla -> Alef
    .replace(/\u06CC/g, 'ي') // Persian Ya -> Ya
    .replace(/\u06C1/g, 'ه'); // Urdu Heh -> Heh

  // 2. Standard normalization
  let result = normalized
    .replace(/(آ|إ|أ|ٱ)/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');

  // Remove Tashkeel and small signs
  result = result.replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06ED]/g, '');
  
  // Remove non-arabic letters (except spaces)
  result = result.replace(/[^\u0621-\u064A\s]/g, '');
  
  return result
    .replace(/\s+/g, ' ')
    .trim();
}

export function convertArabicDigitsToEnglish(str: string) {
  return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
}

export function convertEnglishDigitsToArabic(str: string) {
  return str.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'['0123456789'.indexOf(d)]);
}

export function cleanUthmani(text: string): string {
  if (!text) return '';
  // Remove Tatweel (Kashida) U+0640
  return text.replace(/\u0640/g, '');
}

export const SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس"
];
