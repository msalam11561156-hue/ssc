import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import quickSupportAuditIcon from '../assets/images/quick_support_audit_icon.png';
import { X } from 'lucide-react';

const QUICK_SUPPORT_POP_STORAGE_KEY = 'smart_control_quick_support_pop_views_v1';
const MAX_POP_VIEWS = 15;

interface QuickSupportPopProps {
  targetRef: React.RefObject<HTMLElement | null>;
  onOpenAudit?: () => void;
  isModalOpen?: boolean;
}

export const QuickSupportPop: React.FC<QuickSupportPopProps> = ({
  targetRef,
  onOpenAudit,
  isModalOpen = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
  } | null>(null);
  const countedMountRef = useRef(false);

  // التحقق من عدد مرات الظهور على جهاز العميل (15 مرة كحد أقصى)
  useEffect(() => {
    if (countedMountRef.current) return;
    countedMountRef.current = true;

    try {
      const raw = localStorage.getItem(QUICK_SUPPORT_POP_STORAGE_KEY);
      const currentCount = raw ? parseInt(raw, 10) : 0;
      const safeCount = Number.isFinite(currentCount) && currentCount >= 0 ? currentCount : 0;

      if (safeCount >= MAX_POP_VIEWS) {
        return;
      }

      localStorage.setItem(QUICK_SUPPORT_POP_STORAGE_KEY, String(safeCount + 1));

      const showTimer = window.setTimeout(() => {
        setIsVisible(true);
      }, 350);

      const hideTimer = window.setTimeout(() => {
        setIsVisible(false);
      }, 8500);

      return () => {
        window.clearTimeout(showTimer);
        window.clearTimeout(hideTimer);
      };
    } catch {
      // Fallback if localStorage is unavailable
    }
  }, []);

  // إخفاء البوب تلقائياً عند فتح نافذة الفحص
  useEffect(() => {
    if (isModalOpen && isVisible) {
      setIsVisible(false);
    }
  }, [isModalOpen, isVisible]);

  // حساب موضع البوب بدقة ليشير مباشرة إلى زر الدعم السريع - فحص الأخطاء قبل الطباعة
  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const popWidth = 176;
      const margin = 12;
      const centerX = rect.left + rect.width / 2;
      const clampedLeft = Math.max(
        margin,
        Math.min(window.innerWidth - popWidth - margin, centerX - popWidth / 2)
      );
      const arrowLeft = Math.max(18, Math.min(popWidth - 18, centerX - clampedLeft));

      setCoords({
        top: rect.bottom + 12,
        left: clampedLeft,
        arrowLeft,
      });
    };

    updatePosition();
    const t1 = window.setTimeout(updatePosition, 100);
    const t2 = window.setTimeout(updatePosition, 450);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isVisible, targetRef]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && coords && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.92 }}
          animate={{ opacity: 1, y: [0, 3, 0], scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.92 }}
          transition={{
            opacity: { duration: 0.22 },
            scale: { duration: 0.22 },
            y: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
          }}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '176px',
            zIndex: 85,
          }}
          dir="rtl"
          className="pointer-events-auto select-none"
        >
          {/* سهم يشير مباشرة إلى الزر */}
          <div
            style={{ left: `${coords.arrowLeft}px` }}
            className="absolute -top-[8px] -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-slate-900 border-t-2 border-l-2 border-amber-400 z-0"
          />

          <div
            onClick={() => {
              setIsVisible(false);
              onOpenAudit?.();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsVisible(false);
                onOpenAudit?.();
              }
            }}
            className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white border-2 border-amber-400 shadow-[0_10px_28px_rgba(15,23,42,0.45),0_0_16px_rgba(251,191,36,0.35)] cursor-pointer hover:brightness-110 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm border border-slate-300 shrink-0">
                <img
                  src={quickSupportAuditIcon}
                  alt="الدعم السريع"
                  draggable={false}
                  className="w-5 h-5 object-contain pointer-events-none select-none contrast-125"
                />
              </div>
              <span className="text-xs font-black tracking-wide whitespace-nowrap text-amber-100">
                الدعم السريع
              </span>
            </div>

            <button
              type="button"
              aria-label="إغلاق"
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="w-5 h-5 rounded-full bg-white/15 hover:bg-white/25 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
