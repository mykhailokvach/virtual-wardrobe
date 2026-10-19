import { expect, test, type Page } from '@playwright/test';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

async function pickImage(page: Page, open: () => Promise<void>, name: string) {
  const chooser = page.waitForEvent('filechooser');
  await open();
  await (await chooser).setFiles({ name, mimeType: 'image/png', buffer: PNG });
}

test('create a wardrobe, trace sections, add an item and find it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'New wardrobe' }).click();

  await page.getByLabel('Name').fill('Bedroom closet');
  await pickImage(page, () => page.getByRole('button', { name: 'Choose or take a photo' }).click(), 'closet.png');
  await expect(page.getByRole('img', { name: 'Wardrobe photo preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Create and trace sections' }).click();

  const stage = page.getByTestId('trace-stage');
  await expect(stage.getByRole('img', { name: 'Bedroom closet' })).toBeVisible();
  const box = (await stage.boundingBox())!;
  const drag = async (x1: number, y1: number, x2: number, y2: number) => {
    await page.mouse.move(box.x + box.width * x1, box.y + box.height * y1);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * x2, box.y + box.height * y2, { steps: 5 });
    await page.mouse.up();
  };
  await drag(0.05, 0.05, 0.6, 0.35);
  await drag(0.05, 0.55, 0.6, 0.9);
  await expect(stage.getByRole('button', { name: 'Section 1' })).toBeVisible();
  await expect(stage.getByRole('button', { name: 'Section 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await pickImage(page, () => page.getByRole('button', { name: 'Add item to Section 1' }).click(), 'sneakers.png');
  const addSheet = page.getByRole('dialog', { name: 'Add to Section 1' });
  await addSheet.getByRole('radio', { name: /shoes/i }).click();
  await addSheet.getByLabel(/name/i).fill('Sneakers');
  await addSheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('img', { name: 'Shoes: 1' })).toBeVisible();

  await page.getByRole('link', { name: 'Open Section 1' }).click();
  const sheet = page.getByRole('dialog', { name: 'Section 1' });
  await expect(sheet.getByRole('img', { name: 'Sneakers' })).toBeVisible();

  // Data survives a reload (IndexedDB).
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Section 1' }).getByRole('img', { name: 'Sneakers' })).toBeVisible();
});
