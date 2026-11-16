import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getBrandShieldSync } from '../utils/offlineAssetCache';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let friendly = 'حدث خطأ غير متوقع أثناء تشغيل التطبيق أو الاتصال بقاعدة البيانات.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        if (parsed.error.toLowerCase().includes('permission') || parsed.error.toLowerCase().includes('insufficient')) {
          friendly = 'تعذر الوصول إلى البيانات بسبب صلاحيات الأمان. يرجى التأكد من تسجيل الدخول بحسابك الصحيح ثم المحاولة مرة أخرى.';
        } else if (parsed.error.toLowerCase().includes('quota')) {
          friendly = 'تم الوصول إلى الحد اليومي المجاني لقاعدة البيانات. سيتم إعادة التعيين غداً.';
        }
      }
    } catch {
      // Keep general Arabic message
    }
    return {
      hasError: true,
      errorMessage: friendly,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white [color-scheme:light_only]"
        >
          <div className="w-full max-w-md bg-slate-900/95 border-2 border-rose-500/60 rounded-[28px] p-8 shadow-2xl flex flex-col items-center text-center gap-4">
            <img
              src={getBrandShieldSync()}
              alt="Smart Control Logo"
              className="w-16 h-16 object-contain"
            />
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-white">تنبيه النظام</h2>
            <p className="text-sm text-slate-300 leading-relaxed font-semibold">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
