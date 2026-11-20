export type TranslitScheme = 'passport' | 'iso9' | 'slug';

// Паспортная: ГОСТ Р 52535.1-2006 (как в загранпаспорте, совпадает с рекомендацией ICAO).
const PASSPORT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: 'ie', ы: 'y', ь: '', э: 'e', ю: 'iu', я: 'ia',
};

// ISO 9:1995 / ГОСТ 7.79-2000 (система Б): один знак кириллицы — один знак латиницы, обратимо.
const ISO9: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'ë', ж: 'ž', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', ш: 'š', щ: 'ŝ',
  ъ: 'ʺ', ы: 'y', ь: 'ʹ', э: 'è', ю: 'û', я: 'â',
};

// Для адресов и имён файлов: как у большинства сервисов, без апострофов.
const SLUG: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const TABLES = { passport: PASSPORT, iso9: ISO9, slug: SLUG } as const;

const isLower = (c: string | undefined): boolean => !!c && c !== c.toUpperCase();

/**
 * Транслитерация кириллицы в латиницу. Регистр сохраняется: «Щука» → «Shchuka», «ЩУКА» → «SHCHUKA».
 * Символы вне русского алфавита остаются как есть.
 */
export function transliterate(text: string, scheme: TranslitScheme = 'passport'): string {
  const table = TABLES[scheme];
  const chars = [...text];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const lower = ch.toLowerCase();
    const mapped = table[lower];
    if (mapped === undefined) {
      out += ch;
      continue;
    }
    if (lower === ch) {
      out += mapped;
    } else if (mapped.length <= 1) {
      out += mapped.toUpperCase();
    } else {
      // «Щ» в начале слова → «Shch», внутри заглавного слова → «SHCH»
      const next = chars[i + 1];
      out += isLower(next) || next === undefined || !table[next.toLowerCase()] ? mapped[0]!.toUpperCase() + mapped.slice(1) : mapped.toUpperCase();
    }
  }
  return out;
}

/** Адресная строка из заголовка: «Привет, Мир! 2026» → «privet-mir-2026». */
export function slugify(text: string): string {
  return transliterate(text.toLowerCase(), 'slug')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
