        const { useState, useEffect, useRef } = React;

        const Icons = {
            FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
            Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
            Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
            Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
            Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
            Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
            AlertCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        };

        const App = () => {
            const [inputHtml, setInputHtml] = useState('');
            const [analyzedHtml, setAnalyzedHtml] = useState('');
            const [loading, setLoading] = useState(false);
            const [fileLoading, setFileLoading] = useState(false);
            const [error, setError] = useState('');
            const [copySuccess, setCopySuccess] = useState(false);
            const fileInputRef = useRef(null);

            const handleFileUpload = (event) => {
                const file = event.target.files ? event.target.files[0] : null;
                if (!file) return;

                if (!file.name.toLowerCase().endsWith('.docx')) {
                    setError('عذراً، هذا الملف غير مدعوم. يرجى رفع ملف بصيغة Word (.docx) فقط.');
                    return;
                }

                setFileLoading(true);
                setError('');

                const reader = new FileReader();
                reader.onload = async (e) => {
                    const arrayBuffer = e.target.result;
                    try {
                        // 1. Convert main content with Mammoth
                        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                        
                        if (result.messages && result.messages.length > 0) {
                            console.warn("ملاحظات قراءة الملف:", result.messages);
                        }
                        
                        let finalHtml = result.value || '';

                        // 2. Extract footers with JSZip
                        try {
                            const zip = await JSZip.loadAsync(arrayBuffer);
                            
                            // Find footer files
                            const footerFiles = Object.keys(zip.files).filter(filename => 
                                filename.match(/^word\/footer\d+\.xml$/i)
                            );

                            // Sort by number
                            footerFiles.sort((a, b) => {
                                const aMatch = a.match(/\d+/);
                                const bMatch = b.match(/\d+/);
                                const aNum = aMatch ? parseInt(aMatch[0]) : 0;
                                const bNum = bMatch ? parseInt(bMatch[0]) : 0;
                                return aNum - bNum;
                            });

                            let allFooterText = '';
                            const seenParagraphs = new Set();

                            for (const filename of footerFiles) {
                                const xml = await zip.file(filename).async('string');
                                if (!xml) continue;
                                
                                // Simple regex to extract text from XML
                                // Extract paragraphs <w:p>
                                const pMatches = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
                                
                                for (const pXml of pMatches) {
                                    // Extract text <w:t>
                                    const tMatches = pXml.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
                                    let pText = '';
                                    
                                    for (const tXml of tMatches) {
                                        // Remove tags to get content
                                        const content = tXml.replace(/<[^>]+>/g, '');
                                        pText += content;
                                    }
                                    
                                    const cleanText = pText.trim();
                                    if (cleanText && !seenParagraphs.has(cleanText)) {
                                        seenParagraphs.add(cleanText);
                                        allFooterText += `<p>${pText}</p>`;
                                    }
                                }
                            }

                            if (allFooterText) {
                                finalHtml += `<div class="footer-extraction" style="margin-top: 2em; border-top: 1px solid #eee; padding-top: 1em;">${allFooterText}</div>`;
                            }
                        } catch (zipErr) {
                            console.error("Footer extraction failed:", zipErr);
                            // Continue without footer if extraction fails
                        }
                        
                        if (!finalHtml || finalHtml.trim() === '') {
                            setError('الملف فارغ أو لا يمكن قراءة محتواه. تأكد من أن الملف غير تالف.');
                        } else {
                            setInputHtml(finalHtml);
                        }
                    } catch (err) {
                        setError('فشل في قراءة ملف Word. قد يكون الملف تالفاً أو يحتوي على تنسيقات غير مدعومة.');
                        console.error("خطأ في قراءة الملف:", err);
                    } finally {
                        setFileLoading(false);
                        // Reset input
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                };
                
                reader.onerror = () => {
                    setError('حدث خطأ أثناء قراءة الملف من جهازك.');
                    setFileLoading(false);
                };
                
                reader.readAsArrayBuffer(file);
            };

            const handleAnalyze = async () => {
                if (!inputHtml.trim()) return;
                setLoading(true);
                setError('');
                try {
                    const result = await analyzeArticle(inputHtml);
                    setAnalyzedHtml(result);
                } catch (err) {
                    setError('حدث خطأ أثناء تحليل النص. يرجى التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };

            const copyToClipboard = () => {
                navigator.clipboard.writeText(analyzedHtml).then(() => {
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                });
            };

            return (
                <div className="min-h-screen p-4 md:p-8">
                    <div className="max-w-5xl mx-auto space-y-6">
                        
                        {/* Header */}
                        <header className="text-center space-y-2 mb-8">
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">كاشف ومنسق الآيات القرآنية</h1>
                            <p className="text-slate-500">قم بلصق مقالك وسنقوم باكتشاف الآيات وتنسيقها لك تلقائياً</p>
                        </header>

                        {/* Main Content */}
                        <div className="grid grid-cols-1 gap-6">
                            
                            {/* Input Area */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Icons.FileText />
                                        محتوى المقال
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept=".docx"
                                            className="hidden"
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current.click()}
                                            disabled={fileLoading}
                                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium"
                                        >
                                            {fileLoading ? (
                                                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin"></div>
                                            ) : (
                                                <Icons.Upload />
                                            )}
                                            رفع ملف Word (.docx)
                                        </button>
                                        <div className="text-xs text-slate-400 w-full mt-1 px-1">
                                            ملاحظة: النصوص في "رأس/تذييل الصفحة" (Header/Footer) قد لا تظهر. تأكد من وجودها في المتن.
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            onClick={handleAnalyze}
                                            disabled={loading || !inputHtml.trim()}
                                            className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                                                loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                            }`}
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                                                    جاري التحليل...
                                                </span>
                                            ) : (
                                                <React.Fragment>
                                                    <Icons.Sparkles />
                                                    تحليل وتنسيق
                                                </React.Fragment>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <textarea 
                                        className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-700 leading-relaxed"
                                        placeholder="ألصق نص المقال هنا...
ملاحظة: إذا قمت برفع ملف Word، تأكد من أن النص كاملاً قد ظهر هنا. النصوص الموجودة في تذييل الصفحة (Footer) قد لا تظهر، لذا يرجى لصقها يدوياً هنا."
                                        value={inputHtml}
                                        onChange={(e) => setInputHtml(e.target.value)}
                                    ></textarea>
                                    {inputHtml && (
                                        <button 
                                            onClick={() => setInputHtml('')}
                                            className="absolute top-4 left-4 text-slate-400 hover:text-red-500 bg-white/80 backdrop-blur rounded-full p-1 transition-colors"
                                            title="مسح النص"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
                                        </button>
                                    )}
                                    {fileLoading && (
                                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <span className="text-sm font-medium text-slate-600">جاري قراءة الملف...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Result Area */}
                            {analyzedHtml && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <Icons.Eye />
                                            المعاينة والنتيجة
                                        </h2>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={copyToClipboard}
                                                className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2 text-sm font-medium"
                                            >
                                                {copySuccess ? (
                                                    <React.Fragment><Icons.Check /> تم النسخ</React.Fragment>
                                                ) : (
                                                    <React.Fragment><Icons.Copy /> نسخ كود HTML</React.Fragment>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div 
                                        className="prose prose-slate max-w-none p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 overflow-auto max-h-[600px]"
                                        dangerouslySetInnerHTML={{ __html: analyzedHtml }}
                                    ></div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 border border-red-100">
                                    <Icons.AlertCircle />
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <footer className="text-center text-slate-400 text-sm py-8">
                            نسخة الويب المستقلة لمدونات بلوجر &copy; 2024
                        </footer>
                    </div>
                </div>
            );
        };
