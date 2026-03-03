import { load } from 'cheerio';

export function enhanceStyles(html: string): string {
  const $ = load(html);

  // 1. Apply "Opinion Box" style to specific keywords
  const opinionKeywords = [
    'رأينا المفترى',
    'تخيلات مفتراة',
    'تخيلات عامة',
    'تخيلات هوليودية',
    'نتيجة مفتراة',
    'نتيجة مهمة',
    'جواب مفترى',
    'افتراء',
    'سيناريو تخيلي'
  ];

  $('p, div').each((i, el) => {
    const text = $(el).text().trim();
    
    // Check for Opinion Boxes
    for (const keyword of opinionKeywords) {
      if (text.startsWith(keyword)) {
        $(el).addClass('opinion-box');
        const newHtml = $(el).html()?.replace(keyword, `<strong>${keyword}</strong>`);
        if (newHtml) $(el).html(newHtml);
        return; 
      }
    }

    // Check for Questions
    if (text.startsWith('السؤال:')) {
      const questionText = text.replace('السؤال:', '').trim();
      const newContent = `<h3 class="post-question"><i class="fa-solid fa-circle-question" style="color:var(--brand-color); margin-left:8px;"></i>السؤال: ${questionText}</h3>`;
      $(el).replaceWith(newContent);
    }
  });

  // 2. Headings Logic
  $('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length < 50 && (text.startsWith('الباب') || text.startsWith('فصل') || text.includes('الجزء'))) {
      $(el).replaceWith(`<h2>${$(el).html()}</h2>`);
    }
  });

  // 3. Convert Alphabetical Lists (أ. ب. ج.) to UL
  $('p').each((i, el) => {
    const text = $(el).text().trim();
    if (/^[أ-ي]\.\s/.test(text)) {
      $(el).addClass('list-item-alpha');
      $(el).html(`<span class="list-bullet">${text.charAt(0)}.</span> ${text.substring(2)}`);
    }
  });

  // 4. Handle Signatures / Footer Info
  const lastElements = $('body').children().slice(-5);
  lastElements.each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes('بقلم:') || text.includes('جامعة اليرموك') || /\d{4}/.test(text)) {
      $(el).addClass('author-signature');
      if (!$(el).parent().hasClass('author-card')) {
        $(el).wrapAll('<div class="author-card-wrapper"></div>');
      }
    }
  });

  // 5. Standardize Tables (Barebones for Blogger)
  $('table').each((i, table) => {
    const $table = $(table);
    
    // Remove all attributes from table to make it "on the bone"
    // We keep it completely clean for Blogger's template to style it
    const tableAttribs = Object.keys(table.attribs || {});
    tableAttribs.forEach(attr => $table.removeAttr(attr));
    
    // Clean up all rows and cells
    $table.find('tr, td, th, thead, tbody, tfoot').each((j, el) => {
      const $el = $(el);
      // Keep colspan and rowspan, remove everything else
      const colspan = $el.attr('colspan');
      const rowspan = $el.attr('rowspan');
      
      const attribs = Object.keys(el.attribs || {});
      attribs.forEach(attr => $el.removeAttr(attr));
      
      if (colspan) $el.attr('colspan', colspan);
      if (rowspan) $el.attr('rowspan', rowspan);
    });

    // Check if there's a thead
    let $thead = $table.find('thead');
    if ($thead.length === 0) {
      // Find the first row
      const $firstRow = $table.find('tr').first();
      if ($firstRow.length > 0) {
        // Change td to th in the first row
        $firstRow.find('td').each((j, td) => {
          td.tagName = 'th';
        });
        
        // Create thead and move the first row into it
        $thead = $('<thead></thead>') as any;
        $thead.append($firstRow.clone());
        $firstRow.remove();
        $table.prepend($thead);
      }
    }
  });

  // Return only the inner HTML of the body to avoid <html><head><body> tags
  return $('body').html() || $.html();
}
