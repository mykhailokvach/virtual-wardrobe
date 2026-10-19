import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestRepository, testPhoto } from '../test/fixtures';
import { renderRoute } from '../test/render';

describe('wardrobe list', () => {
  it('shows an empty state when there are no wardrobes', async () => {
    renderRoute('/');
    expect(await screen.findByText('No wardrobes yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New wardrobe' })).toHaveAttribute('href', '/wardrobes/new');
  });

  it('lists saved wardrobes', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Bedroom closet', testPhoto());

    renderRoute('/', { repository });

    const link = await screen.findByRole('link', { name: /bedroom closet/i });
    expect(link).toHaveAttribute('href', `/wardrobes/${wardrobe.id}`);
  });
});

describe('not found', () => {
  it('shows a not-found page for unknown paths', async () => {
    renderRoute('/nope');
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});

describe('wardrobe view', () => {
  it('shows sections with their item counts', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());
    const [shelf] = await repository.saveSections(
      wardrobe.id,
      [{ id: 'shelf', name: 'Top shelf', rect: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 } }],
      {},
    );
    await repository.addItems(shelf.id, [
      { type: 'clothes', photo: testPhoto() },
      { type: 'shoes', photo: testPhoto() },
      { type: 'shoes', photo: testPhoto() },
    ]);

    renderRoute(`/wardrobes/${wardrobe.id}`, { repository });

    const link = await screen.findByRole('link', { name: 'Open Top shelf' });
    expect(link).toHaveAttribute('href', `/wardrobes/${wardrobe.id}/sections/shelf`);
    expect(await screen.findByRole('img', { name: 'Clothes: 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Shoes: 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item to Top shelf' })).toBeInTheDocument();
  });

  it('renames the wardrobe', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());

    const { user } = renderRoute(`/wardrobes/${wardrobe.id}`, { repository });

    await user.click(await screen.findByRole('button', { name: 'Rename wardrobe' }));
    const dialog = screen.getByRole('dialog', { name: 'Rename wardrobe' });
    const input = within(dialog).getByLabelText('Name');
    expect(input).toHaveValue('Closet');
    await user.clear(input);
    await user.type(input, 'Hallway closet{Enter}');

    expect(await screen.findByRole('heading', { name: 'Hallway closet' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await repository.getWardrobe(wardrobe.id))?.name).toBe('Hallway closet');
  });

  it('keeps the name when the rename is blank', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());

    const { user } = renderRoute(`/wardrobes/${wardrobe.id}`, { repository });

    await user.click(await screen.findByRole('button', { name: 'Rename wardrobe' }));
    const dialog = screen.getByRole('dialog', { name: 'Rename wardrobe' });
    await user.clear(within(dialog).getByLabelText('Name'));
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('prompts to trace when there are no sections', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());

    renderRoute(`/wardrobes/${wardrobe.id}`, { repository });

    expect(await screen.findByRole('link', { name: 'Trace sections' })).toHaveAttribute(
      'href',
      `/wardrobes/${wardrobe.id}/edit`,
    );
  });

  it('shows not found for an unknown wardrobe', async () => {
    renderRoute('/wardrobes/missing');
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});
