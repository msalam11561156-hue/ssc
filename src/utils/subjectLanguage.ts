/**
 * Utility functions for subject names in English and Arabic.
 */

export const DEFAULT_SUBJECT_NAMES_EN: Record<string, string> = {
  arabic: 'Arabic Language',
  english: 'English Language',
  math: 'Mathematics',
  science: 'Science',
  social_studies: 'Social Studies',
  religion: 'Religious Education',
  art: 'Art Education',
  ict: 'Information & Communication Technology (ICT)',
  pe: 'Physical Education',
  music: 'Music Education',
  multidisciplinary: 'Multidisciplinary',
  discover: 'Discover',
  french: 'French Language',
  german: 'German Language',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  geology: 'Geology',
  history: 'History',
  geography: 'Geography',
  philosophy: 'Philosophy & Logic',
  psychology: 'Psychology & Sociology',
  national_education: 'National Education',
  tokatsu: 'Tokatsu',
  values: 'Values & Respect for Others',
  skills: 'Professional Skills',
  vocational: 'Vocational Education',
  educational_vocational_activity: 'Educational Vocational Activity',
};

/**
 * Capitalizes the first letter of each word in a string.
 */
export function capitalizeEachWord(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Retrieves the stored English name for a subject, with intelligent fallback.
 */
export function getStoredSubjectEn(key?: string, label?: string): string {
  try {
    const raw = localStorage.getItem('subjects_en_map');
    if (raw) {
      const map = JSON.parse(raw);
      if (key && map[key]) return map[key];
      if (label && map[label.trim()]) return map[label.trim()];
    }
  } catch {}

  // Fallback to default dictionary if key matches
  if (key && DEFAULT_SUBJECT_NAMES_EN[key]) {
    return DEFAULT_SUBJECT_NAMES_EN[key];
  }

  // Fallback by Arabic label
  if (label) {
    const trimmed = label.trim();
    if (trimmed.includes('عرب')) return 'Arabic Language';
    if (trimmed.includes('إنجليز') || trimmed.includes('انجليز')) return 'English Language';
    if (trimmed.includes('رياضيات') || trimmed.includes('حساب')) return 'Mathematics';
    if (trimmed.includes('متكامل')) return 'Integrated Sciences';
    if (trimmed.includes('علوم') || trimmed.includes('العلوم')) return 'Science';
    if (trimmed.includes('دراسات')) return 'Social Studies';
    if (trimmed.includes('دين') || trimmed.includes('ديني')) return 'Religious Education';
    if (trimmed.includes('فني') || trimmed.includes('رسم')) return 'Art Education';
    if (trimmed.includes('تكنولوجيا') || trimmed.includes('حاسب') || trimmed.includes('كمبيوتر') || trimmed === 'ict') return 'ICT';
    if (trimmed.includes('موسيق')) return 'Music Education';
    if (trimmed.includes('بدني') || trimmed.includes('رياضية')) return 'Physical Education';
    if (trimmed.includes('اكتشف')) return 'Discover';
    if (trimmed.includes('فرن')) return 'French Language';
    if (trimmed.includes('ألمان') || trimmed.includes('المان')) return 'German Language';
    if (trimmed.includes('فيزياء')) return 'Physics';
    if (trimmed.includes('كيمياء')) return 'Chemistry';
    if (trimmed.includes('أحياء') || trimmed.includes('احياء')) return 'Biology';
    if (trimmed.includes('جيولوجيا')) return 'Geology';
    if (trimmed.includes('تاريخ')) return 'History';
    if (trimmed.includes('جغرافيا')) return 'Geography';
    if (trimmed.includes('فلسفة')) return 'Philosophy & Logic';
    if (trimmed.includes('برمج') || trimmed.includes('ذكاء')) return 'Programming & AI';
    if (trimmed.includes('علم نفس')) return 'Psychology';
    if (trimmed.includes('وطنية')) return 'National Education';
    if (trimmed.includes('توكاتسو')) return 'Tokkatsu Activities';
    if (trimmed.includes('قيم')) return 'Values';
    if (trimmed.includes('مهارات') || trimmed.includes('مجالات')) return 'Professional Skills';
    if (trimmed.includes('نشاط أول') || trimmed.includes('النشاط الأول')) return 'First Activity';
    if (trimmed.includes('نشاط ثان') || trimmed.includes('النشاط الثانى') || trimmed.includes('النشاط الثاني')) return 'Second Activity';
    if (trimmed.includes('نشاط')) return 'Activity';
  }

  return '';
}

/**
 * Saves the English name for a subject into the persistent storage map.
 */
export function saveStoredSubjectEn(key: string, label: string, nameEn: string): void {
  try {
    let map: Record<string, string> = {};
    const raw = localStorage.getItem('subjects_en_map');
    if (raw) {
      map = JSON.parse(raw) || {};
    }
    const cleanEn = nameEn.trim();
    if (cleanEn) {
      if (key) map[key] = cleanEn;
      if (label) map[label.trim()] = cleanEn;
    } else {
      if (key) delete map[key];
      if (label) delete map[label.trim()];
    }
    localStorage.setItem('subjects_en_map', JSON.stringify(map));
  } catch {}
}
