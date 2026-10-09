export function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateStr);
  }
}

export function parseDMYToISO(dmyStr) {
  if (!dmyStr) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dmyStr)) {
    const [d, m, y] = dmyStr.split('-');
    return `${y}-${m}-${d}`;
  }
  return dmyStr;
}
