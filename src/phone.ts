/**
 * Приводит российский номер к виду «+79161234567» или возвращает null.
 * Понимает «8 (916) 123-45-67», «+7 916 123 45 67», «9161234567», «007…» не принимает.
 * Код зоны не может начинаться с 0, 1 и 2 (такие номера в плане нумерации не выдаются).
 */
export function normalizePhone(value: string): string | null {
  if (/[^\d\s()+\-.]/.test(value)) return null;
  if (value.includes('+') && !value.trim().startsWith('+7')) return null;
  let d = value.replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
  else if (d.length !== 10) return null;
  if (/^[012]/.test(d)) return null;
  return '+7' + d;
}

/** «+79161234567» → «+7 (916) 123-45-67»; для невалидного номера возвращает null. */
export function formatPhone(value: string): string | null {
  const p = normalizePhone(value);
  if (!p) return null;
  return `+7 (${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8, 10)}-${p.slice(10)}`;
}
