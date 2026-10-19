import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestRepository, seedShelf, testPhoto } from '../../test/fixtures';
import { renderRoute } from '../../test/render';

describe('SectionSheet', () => {
  it('lists the items in a section and filters them by type', async () => {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);
    await repository.addItems(shelf.id, [
      { type: 'clothes', name: 'Blue shirt', photo: testPhoto() },
      { type: 'shoes', name: 'Sneakers', photo: testPhoto() },
    ]);

    const { user } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });

    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    expect(await within(sheet).findByRole('img', { name: 'Blue shirt' })).toBeInTheDocument();
    expect(await within(sheet).findByRole('img', { name: 'Sneakers' })).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Shoes' }));

    expect(within(sheet).queryByRole('img', { name: 'Blue shirt' })).not.toBeInTheDocument();
    expect(within(sheet).getByRole('img', { name: 'Sneakers' })).toBeInTheDocument();
  });

  it('shows an empty state for a section without items', async () => {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);

    renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });

    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    expect(await within(sheet).findByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('closes back to the wardrobe view', async () => {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);

    const { user, router } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });

    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));

    expect(router.state.location.pathname).toBe(`/wardrobes/${wardrobe.id}`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
