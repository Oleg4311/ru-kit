import { plural, type Forms } from './plural.ts';

export type Gender = 'm' | 'f' | 'n';

const ONES_M = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const ONES_N = ['', 'одно', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

// Разряды: тысяча — женского рода, остальные мужского.
const SCALES: { forms: Forms; gender: Gender }[] = [
  { forms: ['тысяча', 'тысячи', 'тысяч'], gender: 'f' },
  { forms: ['миллион', 'миллиона', 'миллионов'], gender: 'm' },
  { forms: ['миллиард', 'миллиарда', 'миллиардов'], gender: 'm' },
  { forms: ['триллион', 'триллиона', 'триллионов'], gender: 'm' },
  { forms: ['квадриллион', 'квадриллиона', 'квадриллионов'], gender: 'm' },
  { forms: ['квинтиллион', 'квинтиллиона', 'квинтиллионов'], gender: 'm' },
];

/** Максимум, который умеет читать numberToWords: меньше 10^21. */
export const MAX_WORDS = 10n ** 21n;

function triplet(n: number, gender: Gender): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h) out.push(HUNDREDS[h]!);
  if (t === 1) {
    out.push(TEENS[o]!);
  } else {
    if (t) out.push(TENS[t]!);
    if (o) out.push((gender === 'f' ? ONES_F : gender === 'n' ? ONES_N : ONES_M)[o]!);
  }
  return out;
}

/**
 * Целое число прописью в именительном падеже: 21 → «двадцать один», 2000 → «две тысячи».
 * gender задаёт род последнего разряда («одна рубашка», «одно яблоко»). Принимает number (целое) или bigint.
 */
export function numberToWords(value: number | bigint, opts: { gender?: Gender } = {}): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new RangeError('numberToWords: нужно безопасное целое (для больших чисел передайте bigint)');
  }
  let n = BigInt(value);
  if (n === 0n) return 'ноль';
  const neg = n < 0n;
  if (neg) n = -n;
  if (n >= MAX_WORDS) throw new RangeError('numberToWords: число должно быть меньше 10^21');

  const parts: string[] = [];
  const groups: number[] = [];
  for (let x = n; x > 0n; x /= 1000n) groups.push(Number(x % 1000n));

  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]!;
    if (g === 0) continue;
    if (i === 0) {
      parts.push(...triplet(g, opts.gender ?? 'm'));
    } else {
      const scale = SCALES[i - 1]!;
      parts.push(...triplet(g, scale.gender), plural(g, scale.forms));
    }
  }
  return (neg ? 'минус ' : '') + parts.join(' ');
}

interface Currency {
  major: Forms;
  minor: Forms;
  majorGender: Gender;
  minorGender: Gender;
}

const CURRENCIES = {
  RUB: { major: ['рубль', 'рубля', 'рублей'], minor: ['копейка', 'копейки', 'копеек'], majorGender: 'm', minorGender: 'f' },
  USD: { major: ['доллар', 'доллара', 'долларов'], minor: ['цент', 'цента', 'центов'], majorGender: 'm', minorGender: 'm' },
  EUR: { major: ['евро', 'евро', 'евро'], minor: ['цент', 'цента', 'центов'], majorGender: 'm', minorGender: 'm' },
} satisfies Record<string, Currency>;

export type CurrencyCode = keyof typeof CURRENCIES;

/** Разбирает сумму строго: «123,45», «123.45», 123.45. Возвращает знак, целую часть и копейки (0–99). */
function parseMoney(amount: number | string): { neg: boolean; major: bigint; minor: number } {
  let s = typeof amount === 'number' ? amount.toFixed(2) : amount.trim().replace(/[\s ]/g, '').replace(',', '.');
  if (!/^[-+−]?\d+(\.\d+)?$/.test(s)) throw new TypeError(`rubles: не похоже на сумму: ${String(amount)}`);
  s = s.replace('−', '-');
  const neg = s.startsWith('-');
  const [int, frac = ''] = s.replace(/^[-+]/, '').split('.');
  // округляем до копеек по третьему знаку («половина вверх»), без чисел с плавающей точкой
  let major = BigInt(int!);
  let minor = Number((frac + '00').slice(0, 2));
  if (frac.length > 2 && Number(frac[2]) >= 5) {
    minor += 1;
    if (minor === 100) {
      minor = 0;
      major += 1n;
    }
  }
  return { neg, major, minor };
}

/**
 * Сумма прописью: «сто двадцать три рубля 45 копеек».
 * Копейки по умолчанию цифрами (как в платёжных документах); kopecksInWords: true — словами.
 * Строки разбираются точно; для number используется округление до двух знаков (0,1+0,2 лучше передавать строкой).
 */
export function amountInWords(
  amount: number | string,
  opts: { currency?: CurrencyCode; kopecksInWords?: boolean; capitalize?: boolean } = {},
): string {
  const cur: Currency = CURRENCIES[opts.currency ?? 'RUB'];
  const { neg, major, minor } = parseMoney(amount);
  const majorWords = numberToWords(major, { gender: cur.majorGender });
  const minorText = opts.kopecksInWords
    ? `${numberToWords(minor, { gender: cur.minorGender })} ${plural(minor, cur.minor)}`
    : `${String(minor).padStart(2, '0')} ${plural(minor, cur.minor)}`;
  let text = `${neg && major + BigInt(minor) > 0n ? 'минус ' : ''}${majorWords} ${plural(major, cur.major)} ${minorText}`;
  if (opts.capitalize) text = text[0]!.toUpperCase() + text.slice(1);
  return text;
}
