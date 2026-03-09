        const { useState, useEffect, useRef } = React;

                function App() {
            const [inputHtml, setInputHtml] = useState('');
            const [analyzedHtml, setAnalyzedHtml] = useState('');
            const [loading, setLoading] = useState(false);
            const [fileLoading, setFileLoading] = useState(false);
            const [error, setError] = useState('');
            const [copySuccess, setCopySuccess] = useState(false);
            const [progress, setProgress] = useState(0);
            const [currentLog, setCurrentLog] = useState('');
            const fileInputRef = useRef(null);

            const handleFileUpload = async (event) => {
                const file = event.target.files ? event.target.files[0] : null;
                if (!file) return;

                if (!file.name.toLowerCase().endsWith('.docx')) {
                    setError('عذراً، هذا الملف غير مدعوم. يرجى رفع ملف بصيغة Word (.docx) فقط.');
                    return;
                }

                setFileLoading(true);
                setError('');

                try {
                    const result = await processDocxFile(file);
                    if (!result.html || result.html.trim() === '') {
                        setError('الملف فارغ أو لا يمكن قراءة محتواه. تأكد من أن الملف غير تالف.');
                    } else {
                        setInputHtml(result.html);
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

            const handleAnalyze = async () => {
                if (!inputHtml.trim()) return;
                setLoading(true);
                setError('');
                setProgress(0);
                setCurrentLog('بدأ تحليل النص...');
                try {
                    const result = await analyzeArticle(inputHtml, (p, log) => {
                        if (p !== undefined) setProgress(p);
                        if (log) setCurrentLog(log);
                    });
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
                                            disabled={fileLoading || loading}
                                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        disabled={loading}
                                    ></textarea>
                                    {inputHtml && !loading && (
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

                                {/* Progress Bar */}
                                {loading && (
                                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-700">{currentLog}</span>
                                            <span className="text-sm font-bold text-indigo-600">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                                                style={{ width: progress + '%' }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Result Area */}
                            {analyzedHtml && !loading && (
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
        }

