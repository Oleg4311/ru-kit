import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#pl-out')).toHaveText(/яблоко/);
});

test('значения по умолчанию посчитаны', async ({ page }) => {
  await expect(page.locator('#pl-out')).toHaveText('21 яблоко');
  await expect(page.locator('#w-out')).toHaveText('две тысячи двадцать шесть');
  await expect(page.locator('#m-out')).toHaveText('Двадцать одна тысяча рублей 02 копейки');
  await expect(page.locator('#v-out')).toHaveText('✓ номер корректен');
  await expect(page.locator('#t-out')).toHaveText('Shcherbakov Iuliia Elkina');
  await expect(page.locator('#t-slug')).toHaveText('Адрес: shcherbakov-yuliya-elkina');
  await expect(page.locator('#p-out')).toHaveText('+7 (916) 123-45-67');
  await expect(page.locator('#d-out')).toHaveText('1 час 2 минуты 5 секунд');
});

test('склонение следует за числом', async ({ page }) => {
  const out = page.locator('#pl-out');
  for (const [n, word] of [['1', 'яблоко'], ['2', 'яблока'], ['5', 'яблок'], ['11', 'яблок'], ['22', 'яблока'], ['1,5', 'яблока']] as const) {
    await page.locator('#pl-n').fill(n);
    await expect(out).toContainText(word);
  }
  await page.locator('#pl-n').fill('abc');
  await expect(out).toHaveText('Введите число');
  await expect(out).toHaveClass(/bad/);
});

test('род числительного и ошибка при больших числах', async ({ page }) => {
  await page.locator('#w-n').fill('21');
  await page.locator('#w-g').selectOption('f');
  await expect(page.locator('#w-out')).toHaveText('двадцать одна');
  await page.locator('#w-n').fill('1' + '0'.repeat(21));
  await expect(page.locator('#w-out')).toContainText('меньше 10^21');
});

test('проверка реквизитов: верный и испорченный номер', async ({ page }) => {
  await page.locator('#v-n').fill('7707083894');
  await expect(page.locator('#v-out')).toHaveText('✗ номер не проходит проверку');
  await page.locator('#v-t').selectOption('snils');
  await page.locator('#v-n').fill('112-233-445 95');
  await expect(page.locator('#v-out')).toHaveText('✓ номер корректен');
  await page.locator('#v-t').selectOption('ogrn');
  await page.locator('#v-n').fill('1027700132195');
  await expect(page.locator('#v-out')).toHaveText('✓ номер корректен');
});

test('сумма: ошибка на мусоре и точное округление', async ({ page }) => {
  await page.locator('#m-n').fill('1,005');
  await expect(page.locator('#m-out')).toHaveText('Один рубль 01 копейка');
  await page.locator('#m-n').fill('abc');
  await expect(page.locator('#m-out')).toHaveClass(/bad/);
});

test('текст с HTML выводится как текст, а не разметка', async ({ page }) => {
  await page.locator('#t-s').fill('<img src=x onerror=window.__xss=1>');
  await expect(page.locator('#t-out')).toContainText('<img');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('страница не прокручивается вбок', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`доступность axe: ${scheme} тема`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    // и состояние ошибки тоже должно быть читаемым
    await page.locator('#d-n').fill('abc');
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('version.json содержит версию', async ({ request, baseURL }) => {
  const r = await request.get(new URL('version.json', baseURL).toString());
  expect(r.ok()).toBeTruthy();
  const v = await r.json();
  expect(v.version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(v.commit).toMatch(/^[0-9a-f]{40}$/);
});
