import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, CheckCircle, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="تثبيت التطبيق للعمل بدون إنترنت (Offline)"
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs md:text-sm font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>تثبيت التطبيق (بدون إنترنت)</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="تثبيت التطبيق على الآيفون / الآيباد للعمل بدون إنترنت"
          className="flex items-center gap-2 rounded-xl bg-emerald-600/10 border border-emerald-500/30 px-3.5 py-2 text-xs md:text-sm font-bold text-emerald-700 hover:bg-emerald-600/20 transition-all duration-200"
        >
          <Smartphone className="w-4 h-4" />
          <span>تثبيت التطبيق (بدون إنترنت)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl relative border border-slate-100">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Download className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-black text-slate-900">تثبيت التطبيق على آيفون / آيباد</h3>
              <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
                لتشغيل التطبيق والعمل عليه في أي وقت <strong>بدون إنترنت</strong>:
              </p>

              <ol className="mt-3 text-xs md:text-sm text-slate-700 space-y-2 list-decimal list-inside pr-1">
                <li>اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح سفاري.</li>
                <li>مرر للأسفل واضغط على <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.</li>
                <li>اضغط <strong>إضافة (Add)</strong> بالأعلى.</li>
              </ol>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>سيعمل التطبيق كاملاً من الشاشة الرئيسية بدون الحاجة لاتصال بالإنترنت!</span>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs md:text-sm font-bold text-white hover:bg-slate-800 transition"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
