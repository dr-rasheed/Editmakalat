import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, Eye, RefreshCw } from 'lucide-react';

// Import raw parts
import templateRaw from './blogger-parts/template.html?raw';
import stylesRaw from './blogger-parts/styles.css?raw';
import constantsRaw from './blogger-parts/constants.js?raw';
import utilsRaw from './blogger-parts/utils.js?raw';
import apiRaw from './blogger-parts/api.js?raw';
import searchApiRaw from './blogger-parts/search-api.js?raw';
import htmlUtilsRaw from './blogger-parts/html-utils.js?raw';
import regexPatternsRaw from './blogger-parts/regex-patterns.js?raw';
import analyzerRaw from './blogger-parts/analyzer.js?raw';
import iconsRaw from './blogger-parts/components/Icons.jsx?raw';
import docxProcessorRaw from './blogger-parts/docx-processor.js?raw';
import componentsRaw from './blogger-parts/components.jsx?raw';
import mainRaw from './blogger-parts/main.jsx?raw';

export default function App() {
  const [combinedCode, setCombinedCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('code');
  const [key, setKey] = useState(0); // To force iframe refresh

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
    console.log("Combined code generated, length:", finalHtml.length);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(combinedCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const refreshPreview = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-slate-100 font-sans" dir="rtl">
      {/* Header */}
      <header className="flex-none h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Code size={18} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">بيئة تطوير أداة بلوجر</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Eye size={16} />
            معاينة حية
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'code' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Code size={16} />
            الكود المجمع
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'preview' && (
            <button 
              onClick={refreshPreview}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="تحديث المعاينة"
            >
              <RefreshCw size={18} />
            </button>
          )}
          <button 
            onClick={copyToClipboard}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-lg shadow-indigo-900/20"
          >
            {copySuccess ? (
              <React.Fragment><Check size={16} /> تم النسخ</React.Fragment>
            ) : (
              <React.Fragment><Copy size={16} /> نسخ الكود</React.Fragment>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden bg-white">
        {activeTab === 'preview' ? (
          <iframe 
            key={key}
            srcDoc={combinedCode} 
            className="w-full h-full border-none"
            title="Blogger Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="h-full w-full bg-slate-950 p-6 overflow-auto">
            <textarea 
              className="w-full h-full p-6 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              value={combinedCode}
              readOnly
              dir="ltr"
              spellCheck="false"
            />
          </div>
        )}
      </main>
    </div>
  );
}

