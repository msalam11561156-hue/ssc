import React, { useState } from 'react';
import { FileSpreadsheet, X, Check } from 'lucide-react';
import { StudentData } from '../types';
import * as XLSX from 'xlsx';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentData[];
  stage?: string;
  selectedGrade?: string;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  const [selectedColsFirst, setSelectedColsFirst] = useState<string[]>([]);
  const [selectedColsSecond, setSelectedColsSecond] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Placeholder columns - in reality these should be dynamic
  const columns = ['الاسم', 'رقم الجلوس', 'الرقم القومي', 'الديانة', 'حالة القيد'];

  const handleExport = () => {
    setIsExporting(true);
    // Excel export logic here
    const worksheet = XLSX.utils.json_to_sheet(students);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "ControlSheet.xlsx");
    setIsExporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
        <h2 className="text-xl font-black mb-4">تصدير شيت الكنترول إلى Excel</h2>
        
        <div className="mb-4">
          <h3 className="font-bold">الفصل الدراسي الأول</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {columns.map(col => (
              <label key={col} className="flex items-center gap-2">
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelectedColsFirst([...selectedColsFirst, col]);
                  else setSelectedColsFirst(selectedColsFirst.filter(c => c !== col));
                }} />
                {col}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-bold">الفصل الدراسي الثاني</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {columns.map(col => (
              <label key={col} className="flex items-center gap-2">
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelectedColsSecond([...selectedColsSecond, col]);
                  else setSelectedColsSecond(selectedColsSecond.filter(c => c !== col));
                }} />
                {col}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-200">إلغاء</button>
          <button onClick={handleExport} disabled={isExporting} className="px-4 py-2 rounded-xl bg-green-600 text-white">تصدير الآن</button>
        </div>
      </div>
    </div>
  );
};
