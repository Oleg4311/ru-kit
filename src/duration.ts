import { plural, type Forms } from './plural.ts';

const UNITS: { ms: number; forms: Forms }[] = [
  { ms: 86_400_000, forms: ['день', 'дня', 'дней'] },
  { ms: 3_600_000, forms: ['час', 'часа', 'часов'] },
  { ms: 60_000, forms: ['минута', 'минуты', 'минут'] },
  { ms: 1000, forms: ['секунда', 'секунды', 'секунд'] },
];

/**
 * Длительность по-русски: 3 725 000 мс → «1 час 2 минуты 5 секунд».
 * parts — сколько старших единиц показывать (по умолчанию 3); меньше секунды — «меньше секунды».
 */
export function humanizeDuration(ms: number, opts: { parts?: number } = {}): string {
  if (!Number.isFinite(ms)) throw new RangeError('humanizeDuration: нужно конечное число');
  let rest = Math.floor(Math.abs(ms));
  const out: string[] = [];
  for (const u of UNITS) {
    const n = Math.floor(rest / u.ms);
    rest -= n * u.ms;
    if (n > 0) out.push(`${n} ${plural(n, u.forms)}`);
    if (out.length >= (opts.parts ?? 3)) break;
  }
  return out.length ? out.join(' ') : 'меньше секунды';
}

/** Относительное время: «5 минут назад» / «через 2 дня». now по умолчанию — текущий момент. */
export function relativeTime(date: Date | number, now: Date | number = Date.now()): string {
  const diff = Number(date) - Number(now);
  const text = humanizeDuration(diff, { parts: 1 });
  if (text === 'меньше секунды') return 'только что';
  return diff < 0 ? `${text} назад` : `через ${text}`;
}
