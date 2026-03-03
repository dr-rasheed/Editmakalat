import React, { useState } from 'react';
import { ComplianceIssue } from '../types';

export function useFileHandler() {
  const [file, setFile] = useState<File | null>(null);
  const [html, setHtml] = useState<string>('');
  const [analyzedHtml, setAnalyzedHtml] = useState<string>('');
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [tashkeelLoading, setTashkeelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (uploadedFile: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        let errorMessage = 'حدث خطأ أثناء رفع الملف.';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON (e.g. 502 Bad Gateway HTML page)
          errorMessage = `خطأ في الخادم (${res.status}). قد يكون الملف كبيراً جداً أو غير مدعوم.`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHtml(data.html);
      setAnalyzedHtml(''); // Reset analysis
      setComplianceIssues([]); // Reset compliance
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalyzedHtml(data.html);
      setComplianceIssues(data.issues || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTashkeel = async () => {
    if (!analyzedHtml) return;
    setTashkeelLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tashkeel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: analyzedHtml }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalyzedHtml(data.html);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTashkeelLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      handleUpload(e.target.files[0]);
    }
  };

  return {
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
  };
}
