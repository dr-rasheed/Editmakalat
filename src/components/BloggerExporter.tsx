import React, { useState, useEffect } from 'react';
import { Copy, Check, Code } from 'lucide-react';

// Import raw parts
import templateRaw from '../blogger-parts/template.html?raw';
import stylesRaw from '../blogger-parts/styles.css?raw';
import constantsRaw from '../blogger-parts/constants.js?raw';
import utilsRaw from '../blogger-parts/utils.js?raw';
import apiRaw from '../blogger-parts/api.js?raw';
import searchApiRaw from '../blogger-parts/search-api.js?raw';
import htmlUtilsRaw from '../blogger-parts/html-utils.js?raw';
import regexPatternsRaw from '../blogger-parts/regex-patterns.js?raw';
import analyzerRaw from '../blogger-parts/analyzer.js?raw';
import iconsRaw from '../blogger-parts/components/Icons.jsx?raw';
import docxProcessorRaw from '../blogger-parts/docx-processor.js?raw';
import componentsRaw from '../blogger-parts/components.jsx?raw';
import mainRaw from '../blogger-parts/main.jsx?raw';

export default function BloggerExporter() {
  const [combinedCode, setCombinedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Combine JS parts
    const finalJs = `
${constantsRaw}
${utilsRaw}
${apiRaw}
${searchApiRaw}
${htmlUtilsRaw}
${regexPatternsRaw}
${analyzerRaw}
${docxProcessorRaw}
${iconsRaw}
${componentsRaw}
${mainRaw}
    `;

    // Replace placeholders in template
    let finalHtml = templateRaw.replace('/* CSS_INJECT */', stylesRaw);
    finalHtml = finalHtml.replace('/* JS_INJECT */', finalJs);

    setCombinedCode(finalHtml);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(combinedCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-700">
          <Code />
          كود بلوجر المجمع (Blogger Code)
        </h2>
        <button 
          onClick={copyToClipboard}
          className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          {copySuccess ? (
            <React.Fragment><Check size={16} /> تم النسخ</React.Fragment>
          ) : (
            <React.Fragment><Copy size={16} /> نسخ الكود بالكامل</React.Fragment>
          )}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        هذا المستطيل يحتوي على الكود المجمع من الأقسام المقسمة. انسخه والصقه في صفحة بلوجر.
      </p>
      <textarea 
        className="w-full h-96 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y text-slate-700 font-mono text-sm leading-relaxed bg-slate-50"
        value={combinedCode}
        readOnly
        dir="ltr"
      ></textarea>
    </div>
  );
}
