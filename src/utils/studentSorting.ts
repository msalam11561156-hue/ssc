import { StudentData } from '../types';

export interface SortCriterion {
  id: string;
  direction: 'asc' | 'desc';
}

/**
 * Sort a list of students based on user-defined sort criteria.
 * Supported criteria:
 * - alphabetical / name: Student name
 * - gender: Student gender
 * - status: Enrollment status (حالة القيد)
 * - enrollmentType: Enrollment type (نوعية القيد)
 * - religion: Religion (الديانة)
 * - seatNumber: Seat number for current semester or overall (رقم الجلوس)
 * - secretNumber: Secret number for current semester or overall (الرقم السري)
 * - default: Original natural ordering
 */
export function sortStudents(
  students: StudentData[],
  sortBy: SortCriterion[] = [],
  targetSem: string = 'first',
  lang: string = 'ar'
): StudentData[] {
  if (!students || students.length === 0) return [];
  if (!sortBy || sortBy.length === 0) return [...students];

  const activeCriteria = sortBy.filter(c => c && c.id && c.id !== 'default');
  if (activeCriteria.length === 0) return [...students];

  return [...students].sort((a, b) => {
    for (const criteria of activeCriteria) {
      const modifier = criteria.direction === 'desc' ? -1 : 1;

      if (criteria.id === 'alphabetical' || criteria.id === 'name') {
        const nameA = a.name || '';
        const nameB = b.name || '';
        const cmp = nameA.localeCompare(nameB, lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      } else if (criteria.id === 'gender') {
        const valA = a.gender || '';
        const valB = b.gender || '';
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      } else if (criteria.id === 'status' || criteria.id === 'studentStatus') {
        const valA = a.studentStatus ? (a.studentStatus === 'دمج' ? 'دمج' : 'عادى') : (a.enrollmentStatus || '');
        const valB = b.studentStatus ? (b.studentStatus === 'دمج' ? 'دمج' : 'عادى') : (b.enrollmentStatus || '');
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      } else if (criteria.id === 'enrollmentType') {
        const valA = a.enrollmentType || '';
        const valB = b.enrollmentType || '';
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      } else if (criteria.id === 'religion') {
        const valA = a.religion || '';
        const valB = b.religion || '';
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      } else if (criteria.id === 'seatNumber') {
        const valA = (a.seatNumbers?.[targetSem] || (targetSem === 'first' ? a.seatNumber : '') || a.seatNumber || '').toString();
        const valB = (b.seatNumbers?.[targetSem] || (targetSem === 'first' ? b.seatNumber : '') || b.seatNumber || '').toString();
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
        if (cmp !== 0) return cmp * modifier;
      } else if (criteria.id === 'secretNumber') {
        const valA = (a.secretNumbers?.[targetSem] || (targetSem === 'first' ? a.secretNumber : '') || a.secretNumber || '').toString();
        const valB = (b.secretNumbers?.[targetSem] || (targetSem === 'first' ? b.secretNumber : '') || b.secretNumber || '').toString();
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
        if (cmp !== 0) return cmp * modifier;
      }
    }
    return 0;
  });
}
