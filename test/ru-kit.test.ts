import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  amountInWords,
  count,
  formatNumber,
  formatPhone,
  humanizeDuration,
  isBankAccount,
  isBik,
  isInn,
  isKpp,
  isOgrn,
  isSnils,
  normalizePhone,
  numberToWords,
  plural,
  relativeTime,
  slugify,
  transliterate,
} from '../src/index.ts';

const APPLES = ['яблоко', 'яблока', 'яблок'] as const;

describe('plural', () => {
  test('совпадает с Intl.PluralRules("ru") для всех целых от -2000 до 100000', () => {
    const rules = new Intl.PluralRules('ru');
    const idx: Record<string, 0 | 1 | 2> = { one: 0, few: 1, many: 2, other: 1 };
    for (let n = -2000; n <= 100_000; n++) {
      assert.equal(plural(n, APPLES), APPLES[idx[rules.select(n)]!], `n=${n}`);
    }
  });

  test('особые случаи: 11–14, 21, 101, 111', () => {
    const f = (n: number) => plural(n, APPLES);
    assert.deepEqual([1, 21, 101, 1001].map(f), Array(4).fill('яблоко'));
    assert.deepEqual([2, 3, 4, 22, 104].map(f), Array(5).fill('яблока'));
    assert.deepEqual([0, 5, 11, 12, 13, 14, 111, 112, 114, 1011].map(f), Array(10).fill('яблок'));
  });

  test('дробные числа берут родительный единственного', () => {
    assert.equal(plural(1.5, APPLES), 'яблока');
    assert.equal(plural(0.1, APPLES), 'яблока');
    assert.equal(plural(21.5, APPLES), 'яблока');
  });

  test('bigint и огромные значения', () => {
    assert.equal(plural(10n ** 30n + 1n, APPLES), 'яблоко');
    assert.equal(plural(-(10n ** 30n) - 2n, APPLES), 'яблока');
  });

  test('count и formatNumber', () => {
    assert.equal(count(1234567, APPLES), '1 234 567 яблок');
    assert.equal(formatNumber(1234567.5), '1 234 567,5');
    assert.equal(formatNumber(-1000), '−1 000');
    assert.equal(formatNumber(999), '999');
    assert.equal(formatNumber(10n ** 12n), '1 000 000 000 000');
  });
});

describe('numberToWords', () => {
  const cases: [number | bigint, string][] = [
    [0, 'ноль'],
    [1, 'один'],
    [10, 'десять'],
    [11, 'одиннадцать'],
    [14, 'четырнадцать'],
    [19, 'девятнадцать'],
    [20, 'двадцать'],
    [21, 'двадцать один'],
    [99, 'девяносто девять'],
    [100, 'сто'],
    [101, 'сто один'],
    [111, 'сто одиннадцать'],
    [200, 'двести'],
    [999, 'девятьсот девяносто девять'],
    [1000, 'одна тысяча'],
    [1001, 'одна тысяча один'],
    [2000, 'две тысячи'],
    [5000, 'пять тысяч'],
    [11_000, 'одиннадцать тысяч'],
    [21_000, 'двадцать одна тысяча'],
    [22_000, 'двадцать две тысячи'],
    [100_000, 'сто тысяч'],
    [101_000, 'сто одна тысяча'],
    [1_000_000, 'один миллион'],
    [2_000_001, 'два миллиона один'],
    [5_000_000, 'пять миллионов'],
    [1_000_000_000, 'один миллиард'],
    [123_456_789, 'сто двадцать три миллиона четыреста пятьдесят шесть тысяч семьсот восемьдесят девять'],
    [-15, 'минус пятнадцать'],
    [1_000_000_001_000, 'один триллион одна тысяча'],
    [Number.MAX_SAFE_INTEGER, 'девять квадриллионов семь триллионов сто девяносто девять миллиардов двести пятьдесят четыре миллиона семьсот сорок тысяч девятьсот девяносто один'],
    [10n ** 18n, 'один квинтиллион'],
    [10n ** 21n - 1n, 'девятьсот девяносто девять квинтиллионов девятьсот девяносто девять квадриллионов девятьсот девяносто девять триллионов девятьсот девяносто девять миллиардов девятьсот девяносто девять миллионов девятьсот девяносто девять тысяч девятьсот девяносто девять'],
  ];
  for (const [n, words] of cases) {
    test(String(n), () => assert.equal(numberToWords(n), words));
  }

  test('род последнего разряда', () => {
    assert.equal(numberToWords(21, { gender: 'f' }), 'двадцать одна');
    assert.equal(numberToWords(2, { gender: 'f' }), 'две');
    assert.equal(numberToWords(1, { gender: 'n' }), 'одно');
    assert.equal(numberToWords(1002, { gender: 'f' }), 'одна тысяча две');
    assert.equal(numberToWords(12, { gender: 'f' }), 'двенадцать');
  });

  test('ошибки: дробное, небезопасное целое, слишком большое', () => {
    assert.throws(() => numberToWords(1.5), RangeError);
    assert.throws(() => numberToWords(2 ** 60), RangeError);
    assert.throws(() => numberToWords(10n ** 21n), RangeError);
    assert.throws(() => numberToWords(NaN), RangeError);
  });

  test('в записи нет двойных пробелов и пробелов по краям для всех чисел до 30000', () => {
    for (let n = 0; n < 30_000; n++) {
      const w = numberToWords(n);
      assert.ok(w === w.trim() && !w.includes('  '), `n=${n}: «${w}»`);
    }
  });
});

describe('amountInWords', () => {
  test('рубли и копейки', () => {
    assert.equal(amountInWords('123,45'), 'сто двадцать три рубля 45 копеек');
    assert.equal(amountInWords(1), 'один рубль 00 копеек');
    assert.equal(amountInWords(2.01), 'два рубля 01 копейка');
    assert.equal(amountInWords('21000.02'), 'двадцать одна тысяча рублей 02 копейки');
    assert.equal(amountInWords('0.5'), 'ноль рублей 50 копеек');
    assert.equal(amountInWords('11'), 'одиннадцать рублей 00 копеек');
  });
  test('копейки словами (женский род) и заглавная буква', () => {
    assert.equal(amountInWords('2.21', { kopecksInWords: true, capitalize: true }), 'Два рубля двадцать одна копейка');
  });
  test('доллары и евро', () => {
    assert.equal(amountInWords('1.01', { currency: 'USD', kopecksInWords: true }), 'один доллар один цент');
    assert.equal(amountInWords('5', { currency: 'EUR' }), 'пять евро 00 центов');
  });
  test('округление по третьему знаку без ошибок плавающей точки', () => {
    assert.equal(amountInWords('1.005'), 'один рубль 01 копейка');
    assert.equal(amountInWords('1.004'), 'один рубль 00 копеек');
    assert.equal(amountInWords('1.995'), 'два рубля 00 копеек');
    assert.equal(amountInWords('0.1'), 'ноль рублей 10 копеек');
  });
  test('отрицательные суммы и пробелы-разделители', () => {
    assert.equal(amountInWords('-5'), 'минус пять рублей 00 копеек');
    assert.equal(amountInWords('1 234,50'), 'одна тысяча двести тридцать четыре рубля 50 копеек');
  });
  test('мусор отвергается', () => {
    assert.throws(() => amountInWords('abc'), TypeError);
    assert.throws(() => amountInWords(''), TypeError);
    assert.throws(() => amountInWords('1,2,3'), TypeError);
  });
});

describe('реквизиты', () => {
  test('ИНН: известные настоящие номера', () => {
    assert.ok(isInn('7707083893')); // ПАО Сбербанк
    assert.ok(isInn('7736207543')); // Яндекс
    assert.ok(isInn('500100732259'));
    assert.ok(isInn('77 07 083 893')); // с пробелами
  });
  test('ИНН: неверная контрольная цифра, длина и мусор', () => {
    assert.ok(!isInn('7707083894'));
    assert.ok(!isInn('500100732258'));
    assert.ok(!isInn('770708389'));
    assert.ok(!isInn('77070838930'));
    assert.ok(!isInn('abcdefghij'));
    assert.ok(!isInn(''));
  });
  test('ИНН: при ошибке в одной цифре проверка срабатывает почти всегда', () => {
    for (const inn of ['7707083893', '500100732259']) {
      let rejected = 0;
      let total = 0;
      for (let i = 0; i < inn.length; i++) {
        for (let d = 0; d <= 9; d++) {
          if (String(d) === inn[i]) continue;
          total++;
          if (!isInn(inn.slice(0, i) + d + inn.slice(i + 1))) rejected++;
        }
      }
      assert.ok(rejected / total > 0.9, `${inn}: отвергнуто ${rejected} из ${total}`);
    }
  });
  test('СНИЛС', () => {
    assert.ok(isSnils('112-233-445 95')); // пример из описания алгоритма
    assert.ok(isSnils('11223344595'));
    assert.ok(!isSnils('112-233-445 96'));
    assert.ok(!isSnils('112-233-445'));
    assert.ok(isSnils('001-001-998 00')); // до этого номера контроль не применяется
    // граничные суммы: 100 и 101 дают контрольное число 00, 102 → 01, 202 → 00 (202 mod 101 = 0)
    assert.ok(isSnils('002-008-999 00'));
    assert.ok(isSnils('002-009-899 00'));
    assert.ok(isSnils('002-009-989 01'));
    assert.ok(isSnils('002-999-998 00'));
    assert.ok(!isSnils('002-009-989 00'));
  });
  test('ОГРН и ОГРНИП', () => {
    assert.ok(isOgrn('1027700132195')); // Сбербанк
    assert.ok(isOgrn('1027700070518')); // Газпром
    assert.ok(!isOgrn('1027700132196'));
    assert.ok(isOgrn('304500116000157')); // ОГРНИП
    assert.ok(!isOgrn('304500116000158'));
    assert.ok(!isOgrn('12345'));
  });
  test('КПП и БИК', () => {
    assert.ok(isKpp('773601001'));
    assert.ok(isKpp('7736AB001'));
    assert.ok(!isKpp('77360100'));
    assert.ok(!isKpp('7736ab001'));
    assert.ok(isBik('044525225'));
    assert.ok(!isBik('044525'));
    assert.ok(!isBik('994525225'));
  });
  test('расчётный счёт с БИК', () => {
    assert.ok(isBankAccount('40702810138250123017', '044525225'));
    assert.ok(!isBankAccount('40702810138250123018', '044525225'));
    assert.ok(!isBankAccount('40702810138250123017', '044525226')); // не тот БИК
    assert.ok(!isBankAccount('4070281013825012301', '044525225'));
  });
});

describe('телефоны', () => {
  test('нормализация разных записей', () => {
    for (const v of ['8 (916) 123-45-67', '+7 916 123 45 67', '9161234567', '8-916-123-45-67', '+7(916)1234567', '7 916 123 45 67']) {
      assert.equal(normalizePhone(v), '+79161234567', v);
    }
  });
  test('отказ для неправильных', () => {
    for (const v of ['', '123', '+1 916 123 45 67', '89161234567890', '8 (016) 123-45-67', '8 (116) 123-45-67', 'позвони мне', '+7 916 123 45 6a']) {
      assert.equal(normalizePhone(v), null, v);
    }
  });
  test('форматирование', () => {
    assert.equal(formatPhone('89161234567'), '+7 (916) 123-45-67');
    assert.equal(formatPhone('nope'), null);
  });
});

describe('транслитерация', () => {
  test('паспортная схема (ГОСТ Р 52535.1)', () => {
    assert.equal(transliterate('Щербаков Юлия'), 'Shcherbakov Iuliia');
    assert.equal(transliterate('Дарья'), 'Daria');
    assert.equal(transliterate('Ёлкин Жуков Хохлов'), 'Elkin Zhukov Khokhlov');
    assert.equal(transliterate('Подъезд'), 'Podieezd');
  });
  test('регистр: заглавное слово и неалфавитные символы', () => {
    assert.equal(transliterate('ЩУКА'), 'SHCHUKA');
    assert.equal(transliterate('Щ'), 'Shch');
    assert.equal(transliterate('ЖУК-2026 №5'), 'ZHUK-2026 №5');
    assert.equal(transliterate('Hello Мир'), 'Hello Mir');
  });
  test('ISO 9 обратима: весь алфавит переводится туда и обратно', () => {
    const alphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    const back: Record<string, string> = {};
    for (const ch of alphabet) back[transliterate(ch, 'iso9')] = ch;
    assert.equal(Object.keys(back).length, alphabet.length, 'значения не должны повторяться');
    const latin = transliterate(alphabet, 'iso9');
    assert.equal([...latin].map((c) => back[c]).join(''), alphabet);
    assert.equal(latin.length, alphabet.length, 'ровно один знак на знак');
  });
  test('slugify', () => {
    assert.equal(slugify('Привет, Мир! 2026'), 'privet-mir-2026');
    assert.equal(slugify('  Съешь ещё этих мягких булок  '), 'sesh-eshche-etikh-myagkikh-bulok');
    assert.equal(slugify('!!!'), '');
    assert.equal(slugify('Ёж & Щука'), 'ezh-shchuka');
  });
});

describe('время', () => {
  test('humanizeDuration', () => {
    assert.equal(humanizeDuration(3_725_000), '1 час 2 минуты 5 секунд');
    assert.equal(humanizeDuration(86_400_000 * 5 + 3_600_000 * 2), '5 дней 2 часа');
    assert.equal(humanizeDuration(21 * 60_000), '21 минута');
    assert.equal(humanizeDuration(999), 'меньше секунды');
    assert.equal(humanizeDuration(0), 'меньше секунды');
    assert.equal(humanizeDuration(3_725_000, { parts: 1 }), '1 час');
    assert.equal(humanizeDuration(-61_000), '1 минута 1 секунда');
    assert.throws(() => humanizeDuration(Infinity), RangeError);
  });
  test('relativeTime', () => {
    const now = Date.UTC(2026, 10, 19, 12, 0, 0);
    assert.equal(relativeTime(now - 5 * 60_000, now), '5 минут назад');
    assert.equal(relativeTime(now + 2 * 86_400_000, now), 'через 2 дня');
    assert.equal(relativeTime(now + 200, now), 'только что');
  });
});
