function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّ]/g, ''); // Remove harakat
}

export function getActiveAdSlot(selectedGrade?: string, stage?: string): { grade: string; text: string } | null {
  if (typeof localStorage === 'undefined') return null;
  const savedSlots = localStorage.getItem('sheet_control_ad_slots');
  if (!savedSlots) return null;

  try {
    const slots: { grade: string; text: string }[] = JSON.parse(savedSlots);
    const rawG = String(selectedGrade || '');
    const g = rawG.trim().toLowerCase();
    const gn = normalizeArabic(rawG);
    const st = String(stage || '').trim().toLowerCase();

    const specificGrades = ['kg1', 'kg2', 'prim1', 'prim2', 'prim3', 'prim4', 'prim5', 'prim6', 'prep1', 'prep2', 'prep3', 'sec1', 'sec2', 'sec3'];
    const stageGrades = ['all_kg', 'all_primary', 'all_prep', 'all_secondary'];

    // 1. Try to find a Specific Grade Match (Highest Priority)
    for (const slot of slots) {
      if (!specificGrades.includes(slot.grade)) continue;

      let match = false;
      switch (slot.grade) {
        case 'kg1': match = g.includes('kg1') || gn.includes('اول روضه') || gn.includes('المستوي الاول'); break;
        case 'kg2': match = g.includes('kg2') || gn.includes('ثاني روضه') || gn.includes('المستوي الثاني'); break;
        case 'prim1': match = gn.includes('الاول الابتدائي') || g.includes('prim1') || gn.includes('اول ابتدائي') || (st === 'primary' && gn.includes('الاول')); break;
        case 'prim2': match = gn.includes('الثاني الابتدائي') || g.includes('prim2') || gn.includes('ثاني ابتدائي') || (st === 'primary' && gn.includes('الثاني')); break;
        case 'prim3': match = gn.includes('الثالث الابتدائي') || g.includes('prim3') || gn.includes('ثالث ابتدائي') || (st === 'primary' && gn.includes('الثالث')); break;
        case 'prim4': match = gn.includes('الرابع الابتدائي') || g.includes('prim4') || gn.includes('رابع ابتدائي') || (st === 'primary' && gn.includes('الرابع')); break;
        case 'prim5': match = gn.includes('الخامس الابتدائي') || g.includes('prim5') || gn.includes('خامس ابتدائي') || (st === 'primary' && gn.includes('الخامس')); break;
        case 'prim6': match = gn.includes('السادس الابتدائي') || g.includes('prim6') || gn.includes('سادس ابتدائي') || (st === 'primary' && gn.includes('السادس')); break;
        case 'prep1': match = gn.includes('الاول الاعدادي') || g.includes('prep1') || gn.includes('اول اعدادي') || ((st === 'prep' || st === 'middle') && gn.includes('الاول')); break;
        case 'prep2': match = gn.includes('الثاني الاعدادي') || g.includes('prep2') || gn.includes('ثاني اعدادي') || ((st === 'prep' || st === 'middle') && gn.includes('الثاني')); break;
        case 'prep3': match = gn.includes('الثالث الاعدادي') || g.includes('prep3') || gn.includes('ثالث اعدادي') || ((st === 'prep' || st === 'middle') && gn.includes('الثالث')); break;
        case 'sec1': match = gn.includes('الاول الثانوي') || g.includes('sec1') || gn.includes('اول ثانوي') || (st === 'secondary' && gn.includes('الاول')); break;
        case 'sec2': match = gn.includes('الثاني الثانوي') || g.includes('sec2') || gn.includes('ثاني ثانوي') || (st === 'secondary' && gn.includes('الثاني')); break;
        case 'sec3': match = gn.includes('الثالث الثانوي') || g.includes('sec3') || gn.includes('ثالث ثانوي') || (st === 'secondary' && gn.includes('الثالث')); break;
      }
      if (match) return slot;
    }

    // 2. Try to find a Stage-wide Match (Medium Priority)
    for (const slot of slots) {
      if (!stageGrades.includes(slot.grade)) continue;

      let match = false;
      switch (slot.grade) {
        case 'all_kg': match = st === 'kindergarten' || g.includes('kg') || gn.includes('روضه'); break;
        case 'all_primary': match = st === 'primary' || gn.includes('ابتدائي') || g.includes('prim'); break;
        case 'all_prep': match = st === 'middle' || st === 'prep' || gn.includes('اعدادي') || g.includes('prep'); break;
        case 'all_secondary': match = st === 'secondary' || gn.includes('ثانوي') || g.includes('sec'); break;
      }
      if (match) return slot;
    }

    // 3. Fallback to 'all' (Lowest Priority)
    const allSlot = slots.find(s => s.grade === 'all');
    return allSlot || null;
  } catch {
    return null;
  }
}

export function getActiveFooterTagline(selectedGrade?: string, stage?: string): string {
  const activeSlot = getActiveAdSlot(selectedGrade, stage);
  const defaultTagline = 'المنظومة الرقمية لريادة أعمال المدارس المصرية  01098594956 - 01131097055';
  if (activeSlot && activeSlot.text.trim()) {
    return activeSlot.text.trim();
  }
  return defaultTagline;
}
