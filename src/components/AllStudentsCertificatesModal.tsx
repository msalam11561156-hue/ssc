import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { 
  X, Download, Printer, ChevronRight, ChevronLeft, Award, 
  Sparkles, CheckCircle2, User, Trophy, ShieldCheck, Eye, Layers
} from 'lucide-react';
import { StudentData } from '../types';
import { 
  getTopTenRankedStudents, 
  RankedStudent, 
  renderTopTenCertificateToCanvas, 
  exportTopTenCertificatesPdf 
} from '../utils/topTenCertificatesHelper';

interface AllStudentsCertificatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentData[];
  stage?: string;
  selectedGrade?: string;
  semester?: string;
  schoolName?: string;
  administration?: string;
}

const PortalModal = ({ children }: { children: React.ReactNode }) => {
  return typeof document !== 'undefined' ? createPortal(children, document.body) : <>{children}</>;
};

export const AllStudentsCertificatesModal: React.FC<AllStudentsCertificatesModalProps> = ({
  isOpen,
  onClose,
  students,
  stage = 'primary',
  selectedGrade = '',
  semester = 'first',
  schoolName = '',
  administration = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isExportingSingle, setIsExportingSingle] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Retrieve saved school & control data
  const [schoolData, setSchoolData] = useState(() => {
    let sName = schoolName;
    let sAdmin = administration;
    let sPrincipal = '';
    let sControlHead = '';
    let sLogo = '';
    try {
      sLogo = (
        localStorage.getItem('sheet_control_school_logo') ||
        localStorage.getItem('school_logo') ||
        localStorage.getItem('schoolLogo') ||
        ''
      ).trim();
      const savedSchool = localStorage.getItem('sheet_control_school_data');
      if (savedSchool) {
        const parsed = JSON.parse(savedSchool);
        if (!sName && parsed.schoolName) sName = parsed.schoolName;
        if (!sAdmin && parsed.administration) sAdmin = parsed.administration;
        if (!sLogo && parsed.schoolLogo) sLogo = parsed.schoolLogo;
      }
      const savedControl = localStorage.getItem('sheet_control_control_data_by_stage');
      if (savedControl) {
        const parsed = JSON.parse(savedControl);
        const stKey = stage || '';
        const cur = parsed[stKey] || parsed[''];
        if (cur?.committeeHead) sPrincipal = cur.committeeHead;
        if (cur?.controlHead) sControlHead = cur.controlHead;
      }
    } catch {}
    return {
      schoolName: sName,
      administration: sAdmin,
      schoolPrincipal: sPrincipal,
      controlHead: sControlHead,
      schoolLogo: sLogo,
    };
  });

  const [design, setDesign] = useState<'classic' | 'royal'>('royal');

  const allRankedStudents = useMemo(() => {
    // limit 0 means all students, 'all' means include both normal and damg
    return getTopTenRankedStudents(students, stage, selectedGrade, semester, 'all', 0);
  }, [students, stage, selectedGrade, semester]);

  const currentStudent = allRankedStudents[selectedIndex] || allRankedStudents[0];

  // Render canvas preview whenever selection or options change
  useEffect(() => {
    if (!isOpen || !currentStudent) return;

    let isMounted = true;
    const canvas = canvasRef.current || document.createElement('canvas');

    renderTopTenCertificateToCanvas(
      canvas,
      currentStudent,
      {
        schoolName: schoolData.schoolName,
        administration: schoolData.administration,
        selectedGrade,
        stage,
        showCustomSignatures: true,
        schoolPrincipal: schoolData.schoolPrincipal,
        controlHead: schoolData.controlHead,
        schoolLogo: schoolData.schoolLogo,
        design,
        hideRank: true, // Specific requirement for "All Students" certificates
        shiftNameDown: true,
      }
    ).then(() => {
      if (isMounted) {
        try {
          const url = canvas.toDataURL('image/jpeg', 0.92);
          setPreviewDataUrl(url);
        } catch (e) {
          console.error('Error generating preview data url:', e);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedIndex, currentStudent, schoolData, selectedGrade, design]);

  if (!isOpen) return null;

  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      await exportTopTenCertificatesPdf({
        students,
        stage,
        selectedGrade,
        semester,
        schoolName: schoolData.schoolName,
        administration: schoolData.administration,
        schoolPrincipal: schoolData.schoolPrincipal,
        controlHead: schoolData.controlHead,
        schoolLogo: schoolData.schoolLogo,
        isDamgOnly: 'all',
        showCustomSignatures: true,
        design,
        hideRank: true,
        shiftNameDown: true,
        limit: 0, // all students
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleExportSingle = async () => {
    if (!currentStudent) return;
    setIsExportingSingle(true);
    try {
      await exportTopTenCertificatesPdf({
        students,
        stage,
        selectedGrade,
        semester,
        schoolName: schoolData.schoolName,
        administration: schoolData.administration,
        schoolPrincipal: schoolData.schoolPrincipal,
        controlHead: schoolData.controlHead,
        schoolLogo: schoolData.schoolLogo,
        isDamgOnly: 'all',
        singleStudentIndex: selectedIndex,
        showCustomSignatures: true,
        design,
        hideRank: true,
        shiftNameDown: true,
        limit: 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingSingle(false);
    }
  };

  return (
    <PortalModal>
      <div 
        className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 md:p-6 overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-6xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-2 border-yellow-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Hidden Canvas for High-Resolution Export / Preview */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60 bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-yellow-600 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-yellow-500/20 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <Award className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                    <span>شهادات تقدير جميع الطلاب</span>
                    <span className="text-yellow-400 text-xs md:text-sm font-semibold mr-2">
                      {stage === 'primary' ? 'المرحلة الابتدائية' : stage === 'middle' ? 'المرحلة الإعدادية' : 'المرحلة الثانوية'} - {selectedGrade || 'جميع الصفوف'}
                    </span>
                  </h2>
                </div>
              </div>
              
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
                className="bg-slate-800 text-white py-8 px-4 rounded-lg border border-slate-700 text-sm focus:outline-none focus:border-yellow-500 cursor-pointer appearance-none w-[230px] text-center"
                style={{ MozAppearance: 'none', WebkitAppearance: 'none', textAlignLast: 'center' }}
              >
                {allRankedStudents.map((item, idx) => (
                  <option key={item.student.id || idx} value={idx}>
                    {item.student.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
            {/* Certificate Preview Card */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950/70 border border-slate-700/80 shadow-2xl flex flex-col items-center justify-center p-3 md:p-6 group">
              {previewDataUrl ? (
                <div className="relative w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border-2 border-amber-500/30 bg-black">
                  <img
                    src={previewDataUrl}
                    alt={`شهادة تقدير - ${currentStudent?.student.name || ''}`}
                    className="w-full h-auto object-contain block select-none"
                    draggable={false}
                  />

                  {/* Navigation Arrows on Hover */}
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allRankedStudents.length - 1))}
                      disabled={allRankedStudents.length <= 1}
                      className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-900 text-yellow-400 border border-yellow-400/40 shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                      title="الطالب السابق"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedIndex((prev) => (prev < allRankedStudents.length - 1 ? prev + 1 : 0))}
                      disabled={allRankedStudents.length <= 1}
                      className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-900 text-yellow-400 border border-yellow-400/40 shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                      title="الطالب التالي"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-72 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-9 h-9 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-bold">جاري إعداد ومعاينة الشهادة الفاخرة...</span>
                </div>
              )}

              {/* Student Info Bar below preview */}
              {currentStudent && (
                <div className="w-full max-w-4xl mt-3 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm text-slate-300 bg-slate-900/80 px-4 py-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm md:text-base">
                      {currentStudent.student.name}
                    </span>
                    {/* Rank is hidden here as requested */}
                    {currentStudent.student.seatNumber && (
                      <span className="text-slate-400 text-xs">
                        رقم الجلوس : {currentStudent.student.seatNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {currentStudent.totalScore !== undefined && currentStudent.totalScore !== null && (
                      <span className="font-semibold text-emerald-400">
                        المجموع الكلي : <strong className="text-white font-mono">{currentStudent.totalScore}</strong>
                      </span>
                    )}
                    {currentStudent.percentage && (
                      <span className="font-semibold text-cyan-400">
                        النسبة : <strong className="text-white font-mono">{currentStudent.percentage}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Customization Options Bar */}
            <div className="bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-4 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700">

                  <button
                    onClick={() => setDesign('royal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${design === 'royal' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    التصميم الملكي
                  </button>
                  <button
                    onClick={() => setDesign('classic')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${design === 'classic' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    التصميم الكلاسيكي
                  </button>
                </div>
              </div>

              <span className="text-xs text-slate-400 font-medium">
                إجمالي الشهادات المتاحة : <strong className="text-yellow-400 font-bold">{allRankedStudents.length}</strong>
              </span>
            </div>
          </div>

          {/* Modal Footer / Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-700/60 bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm md:text-base transition-all border-2 border-red-800 cursor-pointer shadow-md"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) => {
                        const dataUrl = re.target?.result as string;
                        
                        // Resize image to avoid localStorage quota issues
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          const MAX_WIDTH = 300;
                          const scaleSize = MAX_WIDTH / img.width;
                          canvas.width = MAX_WIDTH;
                          canvas.height = img.height * scaleSize;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                            localStorage.setItem('sheet_control_school_logo', resizedDataUrl);
                            
                            // Also update schoolLogo inside the main school data object for synchronization
                            try {
                              const saved = localStorage.getItem('sheet_control_school_data');
                              if (saved) {
                                const parsed = JSON.parse(saved);
                                parsed.schoolLogo = resizedDataUrl;
                                localStorage.setItem('sheet_control_school_data', JSON.stringify(parsed));
                              }
                            } catch (e) {
                              console.error('Failed to sync school logo with main data:', e);
                            }

                            alert('تم تغيير الشعار بنجاح');
                            window.location.reload();
                          }
                        };
                        img.src = dataUrl;
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black text-sm md:text-base transition-all border-2 border-slate-700 cursor-pointer shadow-md"
              >
                تغيير الشعار
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportSingle}
                disabled={isExportingSingle || !currentStudent}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-sm md:text-base transition-all border-2 border-slate-600 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>
                  {isExportingSingle ? 'جاري التحميل...' : `تحميل شهادة ${currentStudent?.student.name?.split(' ')[0] || 'الطالب'} ( PDF )`}
                </span>
              </button>

              <button
                onClick={handleExportAll}
                disabled={isExportingAll || allRankedStudents.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-sm md:text-base transition-all border-2 border-yellow-300 shadow-xl shadow-yellow-500/20 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-5 h-5 text-slate-950" />
                <span>
                  {isExportingAll ? 'جاري إنشاء وتحميل الشهادات...' : `تحميل جميع الشهادات ( ${allRankedStudents.length} طلاب ) - PDF`}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </PortalModal>
  );
};
