import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SchoolData, ControlData, Language } from '../types';
import { translations, setCurrentAffiliatedEntity, syncEntityInputText } from '../i18n';
import { ArrowLeft, ArrowRight, ClipboardList, Info, X, Languages, Check, ImagePlus, Upload, Trash2 } from 'lucide-react';

interface MainScreenProps {
  schoolData: SchoolData;
  controlData: ControlData;
  onSchoolChange: (data: SchoolData) => void;
  onControlChange: (data: ControlData) => void;
  onNext: () => void;
  lang: Language;
}

type EnglishFieldKey =
  | 'affiliatedEntityEn'
  | 'administrationEn'
  | 'schoolNameEn'
  | 'educationTypeEn'
  | 'stageEn'
  | 'dataOfficerEn'
  | 'controlHeadEn'
  | 'committeeHeadEn';

const DEFAULT_AFFILIATED_ENTITY_EN: Record<string, string> = {
  moe: 'Ministry of Education',
  azhar: 'Al-Azhar Al-Sharif',
};

const DEFAULT_EDUCATION_TYPE_EN: Record<string, string> = {
  official: 'Official Schools',
  official_languages: 'Official Language Schools',
  official_distinguished: 'Distinguished Official Language Schools',
  private: 'Private Schools',
  other_schools: 'Other Schools',
};

const DEFAULT_STAGE_EN: Record<string, string> = {
  kindergarten: 'Kindergarten Stage',
  primary: 'Primary Stage',
  middle: 'Preparatory Stage',
  secondary: 'Secondary Stage',
};

export const MainScreen: React.FC<MainScreenProps> = ({ schoolData, controlData, onSchoolChange, onControlChange, onNext, lang }) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [tempLogoValue, setTempLogoValue] = useState<string>(schoolData.schoolLogo || '');
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeEnModal, setActiveEnModal] = useState<{
    key: EnglishFieldKey;
    arLabel: string;
    enLabel: string;
    placeholder: string;
  } | null>(null);
  const [tempEnValue, setTempEnValue] = useState('');
  setCurrentAffiliatedEntity(schoolData.affiliatedEntity);
  const t = translations[lang];

  const openLogoModal = () => {
    setTempLogoValue(schoolData.schoolLogo || localStorage.getItem('sheet_control_school_logo') || '');
    setShowLogoModal(true);
  };

  const saveLogoDataUrl = (dataUrl: string) => {
    const trimmed = dataUrl.trim();
    setTempLogoValue(trimmed);
    onSchoolChange({
      ...schoolData,
      schoolLogo: trimmed || undefined,
    });
    try {
      if (trimmed) {
        localStorage.setItem('sheet_control_school_logo', trimmed);
      } else {
        localStorage.removeItem('sheet_control_school_logo');
      }
    } catch (err) {
      console.error('Failed to save school logo:', err);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 300;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');

        let srcX = 0;
        let srcY = 0;
        let srcW = w;
        let srcH = h;

        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, w, h);
          try {
            const imgData = tempCtx.getImageData(0, 0, w, h);
            const data = imgData.data;
            const getPixel = (x: number, y: number) => {
              const idx = (y * w + x) * 4;
              return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
            };
            const corners = [
              getPixel(0, 0),
              getPixel(w - 1, 0),
              getPixel(0, h - 1),
              getPixel(w - 1, h - 1),
            ];
            const avgAlpha = (corners[0][3] + corners[1][3] + corners[2][3] + corners[3][3]) / 4;
            const bgR = (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4;
            const bgG = (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4;
            const bgB = (corners[0][2] + corners[1][2] + corners[2][2] + corners[3][2]) / 4;

            let minX = w;
            let minY = h;
            let maxX = 0;
            let maxY = 0;

            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                if (a < 40) continue;

                if (avgAlpha > 30) {
                  const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
                  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
                  const isLightShadow = r > 165 && g > 165 && b > 165 && chroma < 18;
                  if (diff < 45 || isLightShadow) continue;
                }

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }

            const detW = maxX - minX + 1;
            const detH = maxY - minY + 1;
            if (detW > w * 0.4 && detH > h * 0.4) {
              const insetX = detW * 0.015;
              const insetY = detH * 0.015;
              srcX = minX + insetX;
              srcY = minY + insetY;
              srcW = Math.max(1, detW - insetX * 2);
              srcH = Math.max(1, detH - insetY * 2);
            }
          } catch {
            // Fallback to full image bounds
          }
        }

        const outSize = 600;
        const canvas = document.createElement('canvas');
        canvas.width = outSize;
        canvas.height = outSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, outSize, outSize);
          ctx.save();
          ctx.beginPath();
          ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outSize, outSize);
          ctx.restore();
          const processedDataUrl = canvas.toDataURL('image/png');
          saveLogoDataUrl(processedDataUrl);
        } else {
          saveLogoDataUrl(result);
        }
      };
      img.onerror = () => {
        saveLogoDataUrl(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveLogo = () => {
    saveLogoDataUrl(tempLogoValue);
    setShowLogoModal(false);
  };

  const capitalizeEachWord = (val: string) =>
    val.replace(/(^|[\s.\-/]+)([a-z])/g, (_, sep, char) => sep + char.toUpperCase());

  const openEnglishFieldModal = (
    key: EnglishFieldKey,
    arLabel: string,
    enLabel: string,
    placeholder: string
  ) => {
    let initialVal = '';
    if (key === 'affiliatedEntityEn') {
      initialVal =
        schoolData.affiliatedEntityEn ||
        (schoolData.affiliatedEntity ? DEFAULT_AFFILIATED_ENTITY_EN[schoolData.affiliatedEntity] || '' : '');
    } else if (key === 'administrationEn') {
      initialVal = schoolData.administrationEn || '';
    } else if (key === 'schoolNameEn') {
      initialVal = schoolData.schoolNameEn || '';
    } else if (key === 'educationTypeEn') {
      initialVal =
        schoolData.educationTypeEn ||
        (schoolData.educationType ? DEFAULT_EDUCATION_TYPE_EN[schoolData.educationType] || '' : '');
    } else if (key === 'stageEn') {
      initialVal =
        schoolData.stageEn ||
        (schoolData.stage ? DEFAULT_STAGE_EN[schoolData.stage] || '' : '');
    } else if (key === 'dataOfficerEn') {
      initialVal = controlData.dataOfficerEn || '';
    } else if (key === 'controlHeadEn') {
      initialVal = controlData.controlHeadEn || '';
    } else if (key === 'committeeHeadEn') {
      initialVal = controlData.committeeHeadEn || '';
    }
    setTempEnValue(capitalizeEachWord(initialVal));
    setActiveEnModal({ key, arLabel, enLabel, placeholder });
  };

  const handleSaveEnglishField = () => {
    if (!activeEnModal) return;
    const trimmed = capitalizeEachWord(tempEnValue.trim());
    const { key } = activeEnModal;
    if (key === 'affiliatedEntityEn') {
      const matchedEntity = Object.entries(DEFAULT_AFFILIATED_ENTITY_EN).find(
        ([, val]) => val === trimmed
      )?.[0] as any;
      onSchoolChange({
        ...schoolData,
        ...(matchedEntity
          ? {
              affiliatedEntity: matchedEntity,
              administration: syncEntityInputText(schoolData.administration, matchedEntity),
              schoolName: syncEntityInputText(schoolData.schoolName, matchedEntity),
            }
          : {}),
        affiliatedEntityEn: trimmed,
      });
    } else if (key === 'educationTypeEn') {
      const matchedType = Object.entries(DEFAULT_EDUCATION_TYPE_EN).find(
        ([, val]) => val === trimmed
      )?.[0] as any;
      onSchoolChange({
        ...schoolData,
        ...(matchedType ? { educationType: matchedType } : {}),
        educationTypeEn: trimmed,
      });
    } else if (key === 'stageEn') {
      const matchedStage = Object.entries(DEFAULT_STAGE_EN).find(
        ([, val]) => val === trimmed
      )?.[0] as any;
      onSchoolChange({
        ...schoolData,
        ...(matchedStage ? { stage: matchedStage } : {}),
        stageEn: trimmed,
      });
    } else if (key === 'administrationEn' || key === 'schoolNameEn') {
      onSchoolChange({ ...schoolData, [key]: trimmed });
    } else {
      onControlChange({ ...controlData, [key]: trimmed.slice(0, 60) });
    }
    setActiveEnModal(null);
  };

  const renderLanguageButton = (
    key: EnglishFieldKey,
    arLabel: string,
    enLabel: string,
    placeholder: string,
    hasSavedValue: boolean
  ) => (
    <button
      type="button"
      onClick={() => openEnglishFieldModal(key, arLabel, enLabel, placeholder)}
      title={`تحرير ${arLabel} باللغة الإنجليزية`}
      className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-lg border border-slate-900 flex items-center justify-center transition-all shadow-sm active:scale-95 ${
        hasSavedValue
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
          : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700'
      }`}
    >
      <Languages className="w-4 h-4" />
    </button>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      schoolData.administration && schoolData.schoolName && schoolData.educationType && schoolData.stage &&
      controlData.dataOfficer && controlData.controlHead && controlData.committeeHead
    ) {
      if (!schoolData.affiliatedEntity) {
        setCurrentAffiliatedEntity('moe');
        onSchoolChange({
          ...schoolData,
          affiliatedEntity: 'moe',
          affiliatedEntityEn: schoolData.affiliatedEntityEn || 'Ministry of Education',
        });
      }
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="w-full max-w-4xl mx-auto relative p-[8px] rounded-3xl overflow-hidden shadow-2xl"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[conic-gradient(transparent_270deg,#ffffff_360deg)]"
      />
      
      <div className="rounded-2xl p-8 md:p-12 border-[1.5px] border-slate-900 relative z-10 overflow-hidden w-full h-full">
        <motion.div
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          className="absolute inset-0 z-[-1] bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-[length:400%_400%]"
        />
        
        {/* Title */}
        <div className="flex flex-col items-center justify-center mb-10 gap-4">
          <button
            type="button"
            onClick={openLogoModal}
            title={t.schoolLogo}
            className="relative group rounded-full p-[4px] cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(168,85,247,0.9),0_0_45px_rgba(59,130,246,0.7)]"
          >
            <div className="absolute inset-0 rounded-full animate-pulse bg-gradient-to-tr from-fuchsia-500 via-amber-300 to-cyan-400 blur-md opacity-90 pointer-events-none" />
            <div className="relative w-24 h-24 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center overflow-hidden shadow-inner z-10">
              {schoolData.schoolLogo ? (
                <img
                  src={schoolData.schoolLogo}
                  alt={t.schoolLogo}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <ImagePlus className="w-10 h-10 text-purple-600 transition-transform group-hover:scale-110" />
              )}
            </div>
          </button>

          <motion.div
            animate={{ x: [-8, 8, -8] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            className="relative inline-block pb-4"
          >
            <h2 className="text-3xl font-extrabold text-[#2d3748] px-4 flex items-center justify-center gap-3"><ClipboardList className="w-8 h-8 text-[#a855f7]" />{t.mainScreenTitle}</h2>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#a855f7] to-transparent overflow-hidden rounded-full">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(168,85,247,0.8)]"
              />
            </div>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-[#624b7a]">
                {t.educationalAdministration}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={schoolData.administration}
                  onChange={(e) => onSchoolChange({ ...schoolData, administration: e.target.value })}
                  className="w-full bg-white border-[1.5px] border-slate-900 rounded-lg py-3 pr-4 pl-12 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-800"
                />
                {renderLanguageButton(
                  'administrationEn',
                  t.educationalAdministration,
                  'Educational Administration ( in English )',
                  'e.g. East Alexandria Educational Administration',
                  Boolean(schoolData.administrationEn?.trim())
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-[#624b7a]">
                {t.schoolName}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={schoolData.schoolName}
                  onChange={(e) => onSchoolChange({ ...schoolData, schoolName: e.target.value })}
                  className="w-full bg-white border-[1.5px] border-slate-900 rounded-lg py-3 pr-4 pl-12 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-800"
                />
                {renderLanguageButton(
                  'schoolNameEn',
                  t.schoolName,
                  'School Name ( in English )',
                  'e.g. Future Official Language School',
                  Boolean(schoolData.schoolNameEn?.trim())
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-[#624b7a]">
                {t.educationType}
              </label>
              <div className="relative">
                <select
                  required
                  value={schoolData.educationType}
                  onChange={(e) => {
                    const nextType = e.target.value as any;
                    onSchoolChange({
                      ...schoolData,
                      educationType: nextType,
                      educationTypeEn: DEFAULT_EDUCATION_TYPE_EN[nextType] || schoolData.educationTypeEn || '',
                    });
                  }}
                  className="w-full bg-white border-[1.5px] border-slate-900 rounded-lg py-3 pr-4 pl-12 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-800 appearance-none cursor-pointer"
                >
                  <option value="" disabled>{t.selectEducationType}</option>
                  <option value="official">{t.official}</option>
                  <option value="official_languages">{t.officialLanguages}</option>
                  <option value="official_distinguished">{t.officialDistinguished}</option>
                  <option value="private">{t.private}</option>
                  <option value="other_schools">{t.otherSchools}</option>
                </select>
                {renderLanguageButton(
                  'educationTypeEn',
                  t.educationType,
                  'Education Type ( in English )',
                  'e.g. Official Language Schools',
                  Boolean(schoolData.educationTypeEn?.trim())
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-[#624b7a]">
                {t.educationalStage}
              </label>
              <div className="relative">
                <select
                  required
                  value={schoolData.stage}
                  onChange={(e) => {
                    const nextStage = e.target.value as any;
                    onSchoolChange({
                      ...schoolData,
                      stage: nextStage,
                      stageEn: DEFAULT_STAGE_EN[nextStage] || schoolData.stageEn || '',
                    });
                  }}
                  className="w-full bg-white border-[1.5px] border-slate-900 rounded-lg py-3 pr-4 pl-12 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-800 appearance-none cursor-pointer"
                >
                  <option value="" disabled>{t.selectStage}</option>
                  <option value="kindergarten">{t.kindergarten}</option>
                  <option value="primary">{t.primary}</option>
                  <option value="middle">{t.middle}</option>
                  <option value="secondary">{t.secondary}</option>
                </select>
                {renderLanguageButton(
                  'stageEn',
                  t.educationalStage,
                  'Educational Stage ( in English )',
                  'e.g. Primary Stage',
                  Boolean(schoolData.stageEn?.trim())
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-[#624b7a]">
                {t.dataOfficer}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={controlData.dataOfficer}
                  onChange={(e) => onControlChange({ ...controlData, dataOfficer: e.target.value.slice(0, 40) })}
                  className="w-full bg-white border-[1.5px] border-slate-900 rounded-lg py-3 pr-4 pl-12 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-800"
                />
                {renderLanguageButton(
                  'dataOfficerEn',
                  t.dataOfficer,
                  'Data & Information Officer ( in English )',
                  'e.g. Mr. Ahmed Mohamed',
                  Boolean(controlData.dataOfficerEn?.trim())
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-[#624b7a]">
                {t.controlHead}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={controlData.controlHead}
                  onChange={(e) => onControlChange({ ...controlData, controlHead: e.target.value.slice(0, 40) })}
                  className="w-full bg-white border-[1.5px] border-slate-900 rounded-lg py-3 pr-4 pl-12 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-800"
                />
                {renderLanguageButton(
                  'controlHeadEn',
                  t.controlHead,
                  'Head of Control ( in English )',
                  'e.g. Mr. Mahmoud Hassan',
                  Boolean(controlData.controlHeadEn?.trim())
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-[#624b7a]">
                {t.committeeHead}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={controlData.committeeHead}
                  onChange={(e) => onControlChange({ ...controlData, committeeHead: e.target.value.slice(0, 40) })}
                  className="w-full bg-white border-[1.5px] border-slate-900 rounded-lg py-3 pr-4 pl-12 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-800"
                />
                {renderLanguageButton(
                  'committeeHeadEn',
                  t.committeeHead,
                  'Head of Examination Committee ( in English )',
                  'e.g. Dr. Tarek Ibrahim',
                  Boolean(controlData.committeeHeadEn?.trim())
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col items-center gap-6">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#a855f7] to-transparent relative overflow-hidden rounded-full opacity-50">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(168,85,247,0.8)]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 w-full">
              <button
                type="button"
                onClick={() => setShowInstructions(true)}
                className="flex items-center justify-center bg-[linear-gradient(to_right,#fef08a,#facc15,#eab308,#facc15,#fef08a)] bg-[length:200%_auto] animate-shine text-yellow-950 w-12 h-12 rounded-full transition-all active:scale-[0.98] border border-slate-900 shadow-sm shrink-0"
                title={t.instructionsLabel}
              >
                <Info className="w-full h-full p-1" />
              </button>

              <button
                type="button"
                onClick={openLogoModal}
                className={`h-14 flex items-center justify-center gap-2.5 font-bold px-6 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg shrink-0 ${
                  schoolData.schoolLogo
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                }`}
              >
                <ImagePlus className="w-6 h-6 shrink-0" />
                <span>{t.schoolLogo}</span>
                {schoolData.schoolLogo && (
                  <Check className="w-5 h-5 text-emerald-100 shrink-0" />
                )}
              </button>
              
              <button
                type="submit"
                className="h-14 flex-1 max-w-[50%] flex items-center justify-center gap-2 bg-gradient-to-r from-[#a855f7] to-[#3b82f6] hover:from-[#9333ea] hover:to-[#2563eb] text-white font-bold px-8 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg"
              >
                {t.next}
                {lang === 'ar' ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {showLogoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setShowLogoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              transition={{ duration: 0.25, type: 'spring', bounce: 0.25 }}
              className="relative w-full max-w-md rounded-3xl border-2 border-slate-900 overflow-hidden shadow-2xl p-[6px] bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-[-100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,#f59e0b_0%,#ffffff_25%,#10b981_50%,#ffffff_75%,#f59e0b_100%)] pointer-events-none" />

              <div className="relative z-10 w-full p-6 rounded-2xl bg-white flex flex-col gap-5" dir="rtl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-slate-900 flex items-center justify-center shadow-sm shrink-0">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {t.schoolLogo}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoModal(false)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full min-h-[190px] rounded-2xl border-2 border-dashed border-slate-400 hover:border-purple-600 bg-slate-50 hover:bg-purple-50/40 transition-all flex flex-col items-center justify-center p-4 cursor-pointer gap-3"
                >
                  {tempLogoValue ? (
                    <>
                      <div className="w-32 h-32 rounded-full bg-white border-[1.5px] border-slate-900 shadow-md flex items-center justify-center overflow-hidden">
                        <img
                          src={tempLogoValue}
                          alt={t.schoolLogo}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <span className="text-xs font-bold text-emerald-700">
                        اضغط على الصورة لاختيار شعار آخر
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shadow-inner">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-extrabold text-slate-800">
                          اضغط هنا لتحميل {t.schoolLogo}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          يدعم صور PNG و JPG بجودة عالية
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="h-12 flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold px-4 rounded-xl border-[1.5px] border-slate-900 shadow-sm transition-all active:scale-95 text-base"
                  >
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>{tempLogoValue ? 'تغيير الشعار' : 'اختيار ملف الشعار'}</span>
                  </button>
                  {tempLogoValue && (
                    <button
                      type="button"
                      onClick={() => setTempLogoValue('')}
                      className="h-12 w-28 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 rounded-xl border-[1.5px] border-red-600 transition-all active:scale-95 text-base shrink-0"
                      title="حذف الشعار"
                    >
                      <Trash2 className="w-5 h-5 shrink-0" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveLogo}
                    className="h-12 flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 rounded-xl border-[1.5px] border-slate-900 shadow-md transition-all active:scale-95 text-base"
                  >
                    <Check className="w-5 h-5 shrink-0" />
                    <span>حفظ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoModal(false)}
                    className="h-12 w-28 flex items-center justify-center px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border-[1.5px] border-slate-900 transition-all active:scale-95 text-base shrink-0"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeEnModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setActiveEnModal(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              transition={{ duration: 0.25, type: 'spring', bounce: 0.25 }}
              className="relative w-full max-w-md rounded-3xl border-2 border-slate-900 overflow-hidden shadow-2xl p-[6px] bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-[-100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,#a855f7_0%,#ffffff_25%,#3b82f6_50%,#ffffff_75%,#a855f7_100%)] pointer-events-none" />

              <div className="relative z-10 w-full p-6 rounded-2xl bg-white flex flex-col gap-5" dir="rtl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-slate-900 flex items-center justify-center shadow-sm shrink-0">
                      <Languages className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        تحرير الحقل باللغة الإنجليزية
                      </h3>
                      <p className="text-xs font-bold text-purple-700">
                        {activeEnModal.arLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3" dir="ltr">
                  <label className="block text-xs font-extrabold text-slate-700 text-left">
                    {activeEnModal.enLabel}
                  </label>

                  {activeEnModal.key === 'affiliatedEntityEn' ? (
                    <select
                      value={Object.values(DEFAULT_AFFILIATED_ENTITY_EN).includes(tempEnValue) ? tempEnValue : ''}
                      onChange={(e) => {
                        if (e.target.value) setTempEnValue(e.target.value);
                      }}
                      className="w-full bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-inner"
                    >
                      <option value="" disabled>-- Select Affiliated Entity --</option>
                      {Object.entries(DEFAULT_AFFILIATED_ENTITY_EN).map(([k, val]) => (
                        <option key={k} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : activeEnModal.key === 'educationTypeEn' ? (
                    <select
                      value={Object.values(DEFAULT_EDUCATION_TYPE_EN).includes(tempEnValue) ? tempEnValue : ''}
                      onChange={(e) => {
                        if (e.target.value) setTempEnValue(e.target.value);
                      }}
                      className="w-full bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-inner"
                    >
                      <option value="" disabled>-- Select Education Type --</option>
                      {Object.entries(DEFAULT_EDUCATION_TYPE_EN).map(([k, val]) => (
                        <option key={k} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : activeEnModal.key === 'stageEn' ? (
                    <select
                      value={Object.values(DEFAULT_STAGE_EN).includes(tempEnValue) ? tempEnValue : ''}
                      onChange={(e) => {
                        if (e.target.value) setTempEnValue(e.target.value);
                      }}
                      className="w-full bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-inner"
                    >
                      <option value="" disabled>-- Select Educational Stage --</option>
                      {Object.entries(DEFAULT_STAGE_EN).map(([k, val]) => (
                        <option key={k} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      dir="ltr"
                      autoFocus
                      value={tempEnValue}
                      onChange={(e) => setTempEnValue(capitalizeEachWord(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEnglishField();
                        }
                      }}
                      placeholder={activeEnModal.placeholder}
                      className="w-full bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 text-left font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-inner"
                    />
                  )}
                </div>

                <p className="text-[11px] font-bold text-slate-500 leading-relaxed text-right">
                  سيتم استخدام القيم المحفوظة باللغة الإنجليزية عند طباعة أرقام الجلوس باللغة الإنجليزية  وعند طباعة شهادات الطلاب باللغة الإنجليزية.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveEnglishField}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl border-[1.5px] border-slate-900 shadow-md transition-all active:scale-95"
                  >
                    <Check className="w-5 h-5" />
                    <span>حفظ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEnModal(null)}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border-[1.5px] border-slate-900 transition-all active:scale-95"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/70 backdrop-blur-sm rounded-[10px] [perspective:1000px]"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{ duration: 1.2, type: "spring", bounce: 0.3 }}
              className="relative w-full max-w-lg rounded-3xl border-2 border-slate-900 overflow-hidden shadow-2xl p-[8px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_70%,#ffffff_90%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 w-full p-6 md:p-8 rounded-2xl bg-white bg-[linear-gradient(to_right,rgba(254,240,138,0.75),rgba(250,204,21,0.75),rgba(234,179,8,0.75),rgba(250,204,21,0.75),rgba(254,240,138,0.75))] bg-[length:200%_auto] animate-shine flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  <Info className="w-8 h-8 text-black" />
                </div>
                
                <div className="text-yellow-950 text-base md:text-lg font-bold leading-relaxed text-justify" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  {t.stageDataInstructions}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstructions(false)}
                  className="mt-2 w-full md:w-auto px-12 py-3 bg-[linear-gradient(to_right,#000000,#6b7280,#1f2937,#6b7280,#000000)] bg-[length:200%_auto] animate-shine text-white font-bold text-lg rounded-xl transition-all active:scale-[0.98] border border-white shadow-md"
                >
                  {lang === 'ar' ? 'حسنا' : 'OK'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
