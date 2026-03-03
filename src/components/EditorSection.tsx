import React, { useState } from 'react';
import { FileText, Check, Eye, Code } from 'lucide-react';
import { motion } from 'motion/react';
import ComplianceReport from './ComplianceReport';
import { ComplianceIssue } from '../types';

interface EditorSectionProps {
  html: string;
  analyzedHtml: string;
  complianceIssues?: ComplianceIssue[];
  loading: boolean;
  tashkeelLoading: boolean;
  onAnalyze: () => void;
  onTashkeel: () => void;
  onPreviewClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function EditorSection({ html, analyzedHtml, complianceIssues, loading, tashkeelLoading, onAnalyze, onTashkeel, onPreviewClick }: EditorSectionProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analyzedHtml);
    alert('تم النسخ إلى الحافظة!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {/* Input Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText size={20} /> المحتوى الأصلي
          </h3>
          <button 
            onClick={onAnalyze}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'جاري المعالجة...' : 'تحليل وكشف الآيات'}
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 h-[600px] overflow-y-auto prose prose-slate max-w-none text-right"
             dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {/* Output Result */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Check size={20} /> النتيجة
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode('preview')}
              className={`p-2 rounded-lg ${viewMode === 'preview' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
              title="معاينة"
            >
              <Eye size={20} />
            </button>
            <button 
              onClick={() => setViewMode('code')}
              className={`p-2 rounded-lg ${viewMode === 'code' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
              title="كود HTML"
            >
              <Code size={20} />
            </button>
            {analyzedHtml && (
              <>
                <button 
                  onClick={onTashkeel}
                  disabled={tashkeelLoading}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {tashkeelLoading ? 'جاري التشكيل...' : 'تشكيل النص'}
                </button>
                <button 
                  onClick={copyToClipboard}
                  className="px-3 py-1 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  نسخ HTML
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 h-[600px] overflow-hidden relative flex flex-col">
          {analyzedHtml ? (
            <>
              {viewMode === 'preview' ? (
                <div className="p-6 flex-1 overflow-y-auto prose prose-slate max-w-none text-right cursor-pointer"
                     onClick={onPreviewClick}
                     dangerouslySetInnerHTML={{ __html: analyzedHtml }} />
              ) : (
                <textarea 
                  readOnly 
                  className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none text-left"
                  dir="ltr"
                  value={analyzedHtml}
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <p>اضغط على "تحليل" لرؤية النتيجة</p>
            </div>
          )}
        </div>

        {/* Compliance Report */}
        {complianceIssues && complianceIssues.length > 0 && (
          <ComplianceReport issues={complianceIssues} />
        )}
      </div>
    </motion.div>
  );
}
