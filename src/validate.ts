// Проверка контрольных разрядов российских реквизитов. Проверяется только арифметика номера:
// что организация или человек существуют, функции знать не могут.

const digitsOnly = (s: string): string => s.replace(/[\s\-.]/g, '');
const isDigits = (s: string, len: number): boolean => s.length === len && /^\d+$/.test(s);

function weighted(d: string, weights: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += Number(d[i]) * weights[i]!;
  return (sum % 11) % 10;
}

/** ИНН: 10 цифр (юрлицо) или 12 (физлицо/ИП) с проверкой контрольных цифр. */
export function isInn(value: string): boolean {
  const d = digitsOnly(value);
  if (isDigits(d, 10)) return weighted(d, [2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(d[9]);
  if (isDigits(d, 12)) {
    return (
      weighted(d, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(d[10]) &&
      weighted(d, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(d[11])
    );
  }
  return false;
}

/** СНИЛС: «112-233-445 95» или 11 цифр подряд. Номера до 001-001-998 контрольным числом не проверяются. */
export function isSnils(value: string): boolean {
  const d = digitsOnly(value);
  if (!isDigits(d, 11)) return false;
  const num = Number(d.slice(0, 9));
  if (num <= 1_001_998) return true;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (9 - i);
  let control = sum;
  if (control > 101) control %= 101;
  if (control === 100 || control === 101) control = 0;
  return control === Number(d.slice(9));
}

/** ОГРН (13 цифр) или ОГРНИП (15 цифр). */
export function isOgrn(value: string): boolean {
  const d = digitsOnly(value);
  if (isDigits(d, 13)) return Number((BigInt(d.slice(0, 12)) % 11n) % 10n) === Number(d[12]);
  if (isDigits(d, 15)) return Number((BigInt(d.slice(0, 14)) % 13n) % 10n) === Number(d[14]);
  return false;
}

/** КПП: 9 знаков — 4 цифры, 2 символа причины (цифры или заглавные латинские), 3 цифры. */
export function isKpp(value: string): boolean {
  return /^\d{4}[\dA-Z]{2}\d{3}$/.test(digitsOnly(value));
}

/** БИК: 9 цифр, начинается с 04 (российские банки). */
export function isBik(value: string): boolean {
  const d = digitsOnly(value);
  return isDigits(d, 9) && d.startsWith('04');
}

/** Расчётный (корреспондентский) счёт: 20 цифр и верный контрольный ключ при данном БИК. */
export function isBankAccount(account: string, bik: string): boolean {
  const a = digitsOnly(account);
  const b = digitsOnly(bik);
  if (!isDigits(a, 20) || !isBik(b)) return false;
  // для расчётных счетов берут три последние цифры БИК, для корсчетов (30101…) — «0» и 5-6 цифры БИК
  const prefix = a.startsWith('301') ? '0' + b.slice(4, 6) : b.slice(6);
  const s = prefix + a;
  const w = [7, 1, 3];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += (Number(s[i]) * w[i % 3]!) % 10;
  return sum % 10 === 0;
}
