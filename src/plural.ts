/** Три формы существительного: «1 яблоко», «2 яблока», «5 яблок». */
export type Forms = readonly [one: string, few: string, many: string];

/**
 * Выбирает форму существительного по числу.
 * Дробные числа берут форму родительного падежа единственного числа («1,5 яблока»), то есть вторую.
 */
export function plural(n: number | bigint, forms: Forms): string {
  if (typeof n === 'number' && !Number.isInteger(n)) return forms[1];
  const abs = n < 0 ? -BigInt(n) : BigInt(n);
  const m100 = Number(abs % 100n);
  const m10 = m100 % 10;
  if (m100 >= 11 && m100 <= 14) return forms[2];
  if (m10 === 1) return forms[0];
  if (m10 >= 2 && m10 <= 4) return forms[1];
  return forms[2];
}

/** «5 яблок»: число (с неразрывным пробелом) и правильная форма слова. */
export function count(n: number | bigint, forms: Forms): string {
  return `${formatNumber(n)} ${plural(n, forms)}`;
}

/** Число в русской записи: «1 234 567,5» (неразрывные пробелы между группами, запятая-разделитель). */
export function formatNumber(n: number | bigint): string {
  const s = typeof n === 'bigint' ? n.toString() : String(n);
  if (/e/i.test(s)) return s.replace('.', ',');
  const neg = s.startsWith('-');
  const [int, frac] = (neg ? s.slice(1) : s).split('.');
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + grouped + (frac ? ',' + frac : '');
}
