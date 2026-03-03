import { load } from 'cheerio';

export interface ComplianceIssue {
  type: 'warning' | 'error' | 'success';
  message: string;
  count?: number;
}

export function checkCompliance(html: string): ComplianceIssue[] {
  const $ = load(html);
  const issues: ComplianceIssue[] = [];

  // 1. Check Headings Hierarchy
  // In Blogger templates, H1 is usually the Post Title. Content should start with H2.
  const h1Count = $('h1').length;
  if (h1Count > 0) {
    issues.push({
      type: 'warning',
      message: `تم العثور على ${h1Count} عنوان بصيغة H1. يفضل استخدام H2 للعناوين الرئيسية داخل المقال لتوافق أفضل مع القالب.`,
      count: h1Count
    });
  }

  // 2. Check Images
  const imagesWithoutAlt = $('img:not([alt])').length;
  if (imagesWithoutAlt > 0) {
    issues.push({
      type: 'warning',
      message: `يوجد ${imagesWithoutAlt} صورة بدون نص بديل (Alt Text). يفضل إضافته لتحسين السيو (SEO).`,
      count: imagesWithoutAlt
    });
  }

  // 3. Check Paragraph Length (Readability)
  // Long paragraphs are hard to read on mobile.
  let longParagraphs = 0;
  $('p').each((i, el) => {
    if ($(el).text().length > 800) { 
      longParagraphs++;
    }
  });
  if (longParagraphs > 0) {
    issues.push({
      type: 'warning',
      message: `هناك ${longParagraphs} فقرة طويلة جداً (>800 حرف). يفضل تقسيمها لتسهيل القراءة على الجوال.`,
      count: longParagraphs
    });
  }

  // 4. Check for Unformatted Quran Refs (Potential Misses)
  // We remove the successfully formatted verses, then check the remaining text for patterns like (2:255)
  const bodyClone = $('body').clone();
  bodyClone.find('.quran-verse').remove();
  const remainingText = bodyClone.text();
  
  // Pattern for (Surah:Ayah) or (Ayah) that might have been missed
  const missedRefs = (remainingText.match(/\(\d+:\d+\)/g) || []).length;
  
  if (missedRefs > 0) {
    issues.push({
      type: 'error',
      message: `تم اكتشاف ${missedRefs} نص يشبه الآيات القرآنية لم يتم تنسيقه (مثل: 2:255). تأكد من صحة الأقواس أو عدم وجود مسافات غريبة.`,
      count: missedRefs
    });
  }

  // 5. Check for "Opinion Keywords" that might have been missed (e.g. inside another tag or slightly different format)
  // The enhancer wraps them in .opinion-box. If we find them outside .opinion-box, it's an issue.
  const opinionKeywords = ['رأينا المفترى', 'تخيلات مفتراة', 'جواب مفترى'];
  let missedOpinions = 0;
  
  // Simple text check on the cleaned body (without opinion boxes)
  const bodyWithoutOpinions = $('body').clone().find('.opinion-box').remove().end().text();
  
  for (const kw of opinionKeywords) {
    if (bodyWithoutOpinions.includes(kw)) {
      missedOpinions++;
    }
  }

  if (missedOpinions > 0) {
    issues.push({
      type: 'warning',
      message: `يبدو أن هناك ${missedOpinions} عبارة "رأي مفترى" أو مشابهة لم يتم تنسيقها بشكل صحيح.`,
      count: missedOpinions
    });
  }

  // 6. Success Message if clean
  if (issues.length === 0) {
    issues.push({
      type: 'success',
      message: 'المقال متوافق تماماً مع معايير القالب. عمل رائع!',
    });
  }

  return issues;
}
