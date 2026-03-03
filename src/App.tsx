import React, { useState } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import EditorSection from './components/EditorSection';
import InstructionsModal from './components/InstructionsModal';
import { useFileHandler } from './hooks/useFileHandler';
import { useAudioPlayer } from './hooks/useAudioPlayer';

export default function App() {
  const [showInstructions, setShowInstructions] = useState(false);

  const { 
    file, 
    html, 
    analyzedHtml, 
    complianceIssues,
    loading, 
    error, 
    handleFileChange, 
    handleAnalyze,
    handleTashkeel,
    tashkeelLoading
  } = useFileHandler();

  const { handlePreviewClick } = useAudioPlayer();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8 relative">
        
        {/* Help Button */}
        <button 
          onClick={() => setShowInstructions(true)}
          className="absolute top-0 left-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="دليل الاستخدام والتنسيقات"
        >
          <HelpCircle size={24} />
        </button>

        <Header />

        <UploadSection 
          file={file} 
          onFileChange={handleFileChange} 
        />

        {html && (
          <EditorSection 
            html={html}
            analyzedHtml={analyzedHtml}
            complianceIssues={complianceIssues}
            loading={loading}
            tashkeelLoading={tashkeelLoading}
            onAnalyze={handleAnalyze}
            onTashkeel={handleTashkeel}
            onPreviewClick={handlePreviewClick}
          />
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <InstructionsModal 
          isOpen={showInstructions} 
          onClose={() => setShowInstructions(false)} 
        />

      </div>
    </div>
  );
}

