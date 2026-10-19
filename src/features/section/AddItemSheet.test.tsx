import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage, ImageDecodeError } from '../../lib/image';
import { createTestRepository, seedShelf, testPhoto } from '../../test/fixtures';
import { renderRoute } from '../../test/render';

vi.mock('../../lib/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/image')>()),
  compressImage: vi.fn(),
}));

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

beforeEach(() => {
  vi.mocked(compressImage).mockReset().mockResolvedValue(testPhoto());
  localStorage.clear();
});

async function openShelf() {
  const repository = createTestRepository();
  const { wardrobe, shelf } = await seedShelf(repository);
  const { user } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });
  const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
  const input = sheet.querySelector<HTMLInputElement>('input[type=file]')!;
  return { repository, shelf, user, sheet, input };
}

describe('AddItemSheet', () => {
  it('adds a named pair of shoes from the section sheet', async () => {
    const { repository, shelf, user, sheet, input } = await openShelf();

    await user.upload(input, file('sneakers.jpg'));
    const addSheet = await screen.findByRole('dialog', { name: 'Add to Top shelf' });
    await user.click(await within(addSheet).findByRole('radio', { name: /shoes/i }));
    await user.type(within(addSheet).getByLabelText(/name/i), 'Sneakers');
    await user.click(within(addSheet).getByRole('button', { name: 'Save' }));

    expect(await within(sheet).findByRole('img', { name: 'Sneakers' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Add to Top shelf' })).not.toBeInTheDocument();
    expect(await repository.listItems(shelf.id)).toMatchObject([{ type: 'shoes', name: 'Sneakers' }]);
  });

  it('adds several photos at once and remembers the last type', async () => {
    const { repository, shelf, user, input } = await openShelf();

    await user.upload(input, [file('a.jpg'), file('b.jpg')]);
    const addSheet = await screen.findByRole('dialog', { name: 'Add 2 items to Top shelf' });
    await user.click(await within(addSheet).findByRole('radio', { name: /shoes/i }));
    await user.click(within(addSheet).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('2 items added')).toBeInTheDocument();
    expect((await repository.listItems(shelf.id)).map((i) => i.type)).toEqual(['shoes', 'shoes']);

    await user.upload(input, file('c.jpg'));
    const next = await screen.findByRole('dialog', { name: 'Add to Top shelf' });
    expect(await within(next).findByRole('radio', { name: /shoes/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('reports an unreadable image and adds nothing', async () => {
    vi.mocked(compressImage).mockRejectedValue(new ImageDecodeError());
    const { repository, shelf, user, input } = await openShelf();

    await user.upload(input, file('broken.heic'));

    expect(await screen.findByText(/couldn't read that image/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Add to Top shelf' })).not.toBeInTheDocument();
    expect(await repository.listItems(shelf.id)).toEqual([]);
  });
});
