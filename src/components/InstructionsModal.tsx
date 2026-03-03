import React from 'react';
import { X, Check, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-900 font-amiri">دليل التنسيقات والتعليمات</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto space-y-8 text-right" dir="rtl">
            
            {/* Section 1: How it works */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                <FileText size={24} />
                كيف يعمل البرنامج؟
              </h3>
              <p className="text-slate-600 leading-relaxed">
                يقوم البرنامج بتحليل النص الخاص بك والبحث عن الآيات القرآنية بناءً على الأرقام الموجودة بين أقواس.
                عند العثور على آية، يقوم باستبدال النص المكتوب (حتى لو كان به أخطاء إملائية) بالنص القرآني الرسمي (بالرسم العثماني) مع إضافة تنسيق مميز.
              </p>
            </section>

            {/* Section 2: Input Formats */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                <ArrowLeft size={24} />
                صيغ الكتابة المدعومة (قبل التنسيق)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-2">1. الصيغة الدقيقة (سورة:آية)</div>
                  <p className="text-sm text-slate-500 mb-3">هذه الصيغة هي الأدق والأسرع.</p>
                  <code className="block bg-white p-3 rounded-lg border border-slate-200 text-sm font-mono text-left" dir="ltr">
                    (2:255)<br/>
                    (٢:٢٥٥)
                  </code>
                  <p className="text-xs text-slate-400 mt-2">مثال: سورة البقرة (2)، الآية 255.</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="font-semibold text-slate-900 mb-2">2. صيغة البحث (رقم الآية فقط)</div>
                  <p className="text-sm text-slate-500 mb-3">يبحث البرنامج في النص السابق للرقم لمطابقته.</p>
                  <code className="block bg-white p-3 rounded-lg border border-slate-200 text-sm font-mono text-left" dir="ltr">
                    الله لا إله إلا هو الحي القيوم (255)<br/>
                    ...الحي القيوم (٢٥٥)
                  </code>
                  <p className="text-xs text-slate-400 mt-2">يجب كتابة كلمة أو كلمتين صحيحتين على الأقل قبل الرقم.</p>
                </div>
              </div>
            </section>

            {/* Section 3: Output Format */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                <Check size={24} />
                التنسيق الناتج (بعد المعالجة)
              </h3>
              <p className="text-slate-600">
                يقوم البرنامج بتحويل النص إلى كود HTML التالي. يمكنك استخدام فئات CSS هذه لتخصيص المظهر في موقعك.
              </p>
              
              <div className="bg-slate-900 text-slate-50 p-6 rounded-xl overflow-x-auto text-left" dir="ltr">
                <pre className="font-mono text-sm">
{`<div class="quran-verse" data-surah="2" data-ayah="255">
  اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...
  <br>
  <a href="..." class="verse-ref" target="_blank">
    [سورة البقرة : 255]
  </a>
</div>`}
                </pre>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="font-semibold text-slate-900">فئات CSS المستخدمة:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-sm">
                  <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">.quran-verse</code> : الحاوية الرئيسية للآية.</li>
                  <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">.verse-ref</code> : رابط المرجع (اسم السورة ورقم الآية).</li>
                  <li><code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">data-surah</code> & <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">data-ayah</code> : سمات بيانات تستخدم للتشغيل الصوتي.</li>
                </ul>
              </div>
            </section>

            {/* Section 4: External Sites Tips */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                <AlertCircle size={24} />
                نصائح عند النسخ من المواقع الخارجية
              </h3>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 space-y-4">
                <p className="text-indigo-900 font-semibold">
                  مشكلة الخطوط في موقع Quran.com:
                </p>
                <p className="text-indigo-800/80 text-sm leading-relaxed">
                  موقع Quran.com يستخدم أحياناً خطوطاً خاصة (Uthmanic Fonts) تعتمد على رموز غير قياسية. لضمان أفضل مطابقة وتنسيق، يرجى اتباع الآتي عند النسخ منه:
                </p>
                <ul className="list-disc list-inside space-y-2 text-indigo-800/80 text-sm">
                  <li>من إعدادات الموقع (Settings)، اختر نوع الخط <strong>Indopak</strong> أو <strong>Simple Text</strong>.</li>
                  <li>عند الضغط على زر النسخ، اختر <strong>Copy Text</strong> (النص العادي) بدلاً من نسخ الرموز المزخرفة.</li>
                  <li>البرنامج سيقوم تلقائياً بتحويل هذا النص البسيط إلى نص عثماني فاخر عند المعالجة.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Tips */}
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-2">
                <AlertCircle size={20} />
                ملاحظات هامة للمطورين وأصحاب المدونات
              </h3>
              <ul className="list-disc list-inside space-y-2 text-amber-900/80 text-sm">
                <li>البرنامج يعتمد على خط <strong>Amiri</strong>. لضمان ظهور الآيات بشكل صحيح في مدونتك (Blogger)، تأكد من إضافة الخط في قالب المدونة.</li>
                <li>يتم استبدال النص الذي تنسخه بنص "رسمي" من قاعدة البيانات، لذا لا تقلق إذا كان النص المنسوخ يظهر بشكل غريب في البداية.</li>
                <li>عند النقر على الآية في المعاينة، يتم تشغيل التلاوة الصوتية للتأكد من صحة الآية.</li>
              </ul>
            </section>

          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              فهمت ذلك
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
