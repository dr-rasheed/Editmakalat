import React from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'motion/react';

interface UploadSectionProps {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadSection({ file, onFileChange }: UploadSectionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center"
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
          <Upload size={32} />
        </div>
        <h2 className="text-xl font-semibold">رفع المقالة</h2>
        <p className="text-slate-500 max-w-md">
          اختر ملف Word (.docx, .doc) أو Markdown (.md) للبدء.
        </p>
        
        <label className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
          اختر ملفاً
          <input type="file" className="hidden" onChange={onFileChange} accept=".docx,.doc,.md,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        </label>
        {file && <div className="text-sm text-slate-600 font-medium">{file.name}</div>}
      </div>
    </motion.div>
  );
}
