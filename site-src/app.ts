import {
  amountInWords,
  formatNumber,
  formatPhone,
  humanizeDuration,
  isBik,
  isInn,
  isKpp,
  isOgrn,
  isSnils,
  numberToWords,
  plural,
  slugify,
  transliterate,
  type CurrencyCode,
  type Gender,
  type TranslitScheme,
} from '../src/index.ts';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const val = (id: string): string => $<HTMLInputElement>(id).value;

/** Показывает результат или понятную ошибку: библиотека бросает исключения на недопустимый ввод. */
function show(out: string, fn: () => string): void {
  const el = $(out);
  try {
    el.textContent = fn();
    el.classList.remove('bad');
  } catch (e) {
    el.textContent = e instanceof Error ? e.message : String(e);
    el.classList.add('bad');
  }
}

function render(): void {
  show('pl-out', () => {
    const raw = val('pl-n').trim().replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error('Введите число');
    const n = raw.includes('.') ? Number(raw) : BigInt(raw);
    return `${formatNumber(n)} ${plural(n, [val('pl-1'), val('pl-2'), val('pl-5')])}`;
  });

  show('w-out', () => {
    const raw = val('w-n').trim().replace(/[\s ]/g, '');
    if (!/^-?\d+$/.test(raw)) throw new Error('Нужно целое число');
    return numberToWords(BigInt(raw), { gender: val('w-g') as Gender });
  });

  show('m-out', () => amountInWords(val('m-n'), { currency: val('m-c') as CurrencyCode, capitalize: true }));

  const vout = $('v-out');
  const num = val('v-n');
  const checks: Record<string, (s: string) => boolean> = { inn: isInn, snils: isSnils, ogrn: isOgrn, kpp: isKpp, bik: isBik };
  const ok = (checks[val('v-t')] ?? isInn)(num);
  vout.innerHTML = '';
  const span = document.createElement('span');
  span.className = ok ? 'ok' : 'bad';
  span.textContent = ok ? '✓ номер корректен' : '✗ номер не проходит проверку';
  vout.append(span);

  const scheme = val('t-m') as TranslitScheme;
  $('t-out').textContent = transliterate(val('t-s'), scheme);
  $('t-slug').textContent = 'Адрес: ' + slugify(val('t-s'));

  const phone = formatPhone(val('p-n'));
  const pout = $('p-out');
  pout.textContent = phone ?? 'Не похоже на российский номер';
  pout.classList.toggle('bad', phone === null);

  show('d-out', () => {
    const raw = val('d-n').trim();
    if (!/^-?\d+$/.test(raw)) throw new Error('Нужно целое число миллисекунд');
    return humanizeDuration(Number(raw));
  });
}

document.querySelectorAll('input, select, textarea').forEach((el) => el.addEventListener('input', render));
render();
