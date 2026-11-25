import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-16 left-4 z-[90] flex items-center gap-2 rounded-xl bg-amber-500/95 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg border border-slate-900/40 backdrop-blur-sm select-none pointer-events-none"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>وضع عدم الاتصال — العمل من الذاكرة المحلية</span>
    </div>
  );
};
