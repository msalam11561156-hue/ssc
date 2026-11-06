/**
 * مساعد لتحويل وتنسيق لغة الأرقام بين العربية (٠-٩) والإنجليزية (0-9)
 */
export type NumberLang = 'ar' | 'en';

export function getNumberLang(): NumberLang {
  if (typeof window === 'undefined') return 'ar';
  return (localStorage.getItem('sheet_control_number_lang') as NumberLang) || 'ar';
}

export function formatNumberDigits(value: string | number | null | undefined, numberLang?: NumberLang): string {
  const lang = numberLang || getNumberLang();
  if (value === undefined || value === null || value === '') return '';
  const str = String(value);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  if (lang === 'ar') {
    // تحويل الأرقام الإنجليزية إلى عربية-هندية، واستبدال النقطة العشرية بفاصلة
    return str.replace(/[0-9]/g, (d) => arabicDigits[Number(d)]).replace(/\./g, ',');
  } else {
    // تحويل الأرقام العربية-الهندية إلى إنجليزية، واستبدال الفاصلة العشرية بنقطة
    return str.replace(/[٠-٩]/g, (d) => {
      const idx = arabicDigits.indexOf(d);
      return idx !== -1 ? englishDigits[idx] : d;
    }).replace(/,/g, '.');
  }
}

// Global Canvas fillText patch so all exported files, certificates, charts, and report sheets automatically apply numberLang
if (typeof window !== 'undefined') {
  const proto = CanvasRenderingContext2D.prototype as any;
  if (!proto._numberLangPatched) {
    proto._numberLangPatched = true;
    const originalFillText = proto.fillText;
    proto.fillText = function (text: any, x: number, y: number, maxWidth?: number) {
      if (text !== null && text !== undefined) {
        const activeOverride = (window as any)._activePdfNumberLang;
        const lang: NumberLang = activeOverride || (localStorage.getItem('sheet_control_number_lang') as NumberLang) || 'ar';
        const formattedStr = formatNumberDigits(String(text), lang);
        if (maxWidth !== undefined) {
          return originalFillText.call(this, formattedStr, x, y, maxWidth);
        } else {
          return originalFillText.call(this, formattedStr, x, y);
        }
      }
      return originalFillText.call(this, text, x, y);
    };
  }
}
