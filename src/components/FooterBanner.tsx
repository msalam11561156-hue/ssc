import React, { useState } from 'react';
import { Share2, Facebook } from 'lucide-react';
import { Language } from '../types';
import { ShareModal } from './ShareModal';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterBannerProps {
  lang: Language;
  isFooterEnabled: boolean;
}

export const FooterBanner: React.FC<FooterBannerProps> = ({ lang, isFooterEnabled }) => {
  const [isShareOpen, setIsShareOpen] = useState(false);





  const bannerText = lang === 'ar' 
    ? (
      <span className="flex items-center gap-3 whitespace-nowrap" dir="rtl">
        لمتابعة الاصدارات الاخرى للتطبيقات التعليمية المختلفة والمتطورة والعصرية يسعدنا إنضمامكم إلينا عبر منصات التواصل الاجتماعى المختلفة - الدعم الفنى 01098594956 - 01131097055
      </span>
    )
    : (
      <span className="flex items-center gap-3 whitespace-nowrap" dir="ltr">
        To follow other educational apps releases, we are pleased to have you join us across different social media platforms - Technical Support 01098594956 - 01131097055
      </span>
    );


  // Direction logic: reversed as requested
  const scrollAnimation = lang === 'ar' ? 'animate-scroll-ltr' : 'animate-scroll-rtl';

  return (
    <>
      <div className="w-full px-2 pt-1 pb-2 mt-auto bg-transparent flex items-center gap-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Marquee Banner */}
        <div className="flex-1 overflow-hidden bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#3b82f6] bg-[length:200%_auto] animate-gradient-x border-[1.5px] border-slate-900 rounded-lg shadow-sm h-14 flex items-center relative" dir="ltr">
          <style>
            {`
              @keyframes scroll-ltr {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100vw); }
              }
              @keyframes scroll-rtl {
                0% { transform: translateX(100vw); }
                100% { transform: translateX(-100%); }
              }
              @keyframes gradient-x {
                0%, 100% {
                  background-position: 0% 50%;
                }
                50% {
                  background-position: 100% 50%;
                }
              }
              .animate-scroll-ltr {
                animation: scroll-ltr 45s linear infinite;
                display: inline-block;
              }
              .animate-scroll-rtl {
                animation: scroll-rtl 45s linear infinite;
                display: inline-block;
              }
              .animate-gradient-x {
                animation: gradient-x 4s ease infinite;
              }
            `}
          </style>
          <div className={`${scrollAnimation} whitespace-nowrap text-white font-bold text-base px-4 drop-shadow-md`}>
            {bannerText}
          </div>
        </div>


        {/* Facebook Group Join Button */}
        <a 
          href="https://www.facebook.com/share/g/14zcsmfGSak/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2 bg-[#1877f2] hover:bg-[#166fe5] text-white border-[1.5px] border-slate-900 rounded-lg transition-all shadow-sm shrink-0 h-14 group"
          title="انضم إلينا لجروب فيسبوك"
        >
          <span className="font-bold text-white text-xs md:text-sm whitespace-nowrap">{lang === 'ar' ? 'فيسبوك' : 'Facebook'}</span>
          <Facebook className="w-4 h-4 fill-white" />
        </a>

        {/* Telegram Group Join Button */}
        <a 
          href="https://t.me/+yyoryJeMB4g2MzU0"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2 bg-[#229ed9] hover:bg-[#1e8bc3] text-white border-[1.5px] border-slate-900 rounded-lg transition-all shadow-sm shrink-0 h-14 group"
          title="انضم إلينا لقناة/جروب تليجرام"
        >
          <span className="font-bold text-white text-xs md:text-sm whitespace-nowrap">{lang === 'ar' ? 'تليجرام' : 'Telegram'}</span>
          <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.228-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.12.098.153.228.169.331.016.104.032.341.016.529z"/>
          </svg>
        </a>

        {/* WhatsApp Group Join Button */}
        <a 
          href="https://chat.whatsapp.com/Kuz9E763ORk2bKWqd7JCt5"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2 bg-[#25d366] hover:bg-[#20ba5a] text-white border-[1.5px] border-slate-900 rounded-lg transition-all shadow-sm shrink-0 h-14 group"
          title="انضم إلينا لجروب واتساب"
        >
          <span className="font-bold text-white text-xs md:text-sm whitespace-nowrap">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
          <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </a>

        <PWAInstallButton lang={lang} />

        {/* Share Button */}
        <button 
          onClick={async () => {
            try {
              if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(window.location.href);
              }
            } catch {}
            setIsShareOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-[1.5px] border-slate-900 rounded-lg hover:bg-slate-100 transition-colors shadow-sm shrink-0 h-14 cursor-pointer"
          title={lang === 'ar' ? 'نسخ ومشاركة رابط التطبيق' : 'Copy and share app link'}
        >
          <span className="font-bold text-slate-800 text-xs md:text-sm">{lang === 'ar' ? 'مشاركة' : 'Share'}</span>
          <Share2 className="w-4 h-4 text-slate-800" />
        </button>
      </div>
      
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} lang={lang} />
    </>
  );
};
