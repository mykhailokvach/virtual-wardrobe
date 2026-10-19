import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('ItemDetail', () => {
  async function openItem() {
    const repository = createTestRepository();
    const { wardrobe, shelf } = await seedShelf(repository);
    await repository.saveSections(
      wardrobe.id,
      [
        { id: shelf.id, name: 'Top shelf', rect: shelf.rect },
        { id: 'drawer', name: 'Drawer', rect: { x: 0.1, y: 0.6, w: 0.5, h: 0.2 } },
      ],
      {},
    );
    const [item] = await repository.addItems(shelf.id, [{ type: 'clothes', name: 'Blue shirt', photo: testPhoto() }]);
    const { user } = renderRoute(`/wardrobes/${wardrobe.id}/sections/${shelf.id}`, { repository });
    const sheet = await screen.findByRole('dialog', { name: 'Top shelf' });
    await user.click(await within(sheet).findByRole('button', { name: 'Blue shirt' }));
    const detail = await screen.findByRole('dialog', { name: 'Blue shirt' });
    return { repository, shelf, item, user, sheet, detail };
  }

  it('renames an item and changes its type', async () => {
    const { repository, shelf, user, detail } = await openItem();

    const nameInput = within(detail).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Linen shirt');
    await user.click(within(detail).getByRole('radio', { name: /shoes/i }));
    await user.click(within(detail).getByRole('button', { name: 'Close' }));

    await vi.waitFor(async () =>
      expect(await repository.listItems(shelf.id)).toMatchObject([{ name: 'Linen shirt', type: 'shoes' }]),
    );
  });

  it('moves an item to another section', async () => {
    const { repository, user, sheet, detail } = await openItem();

    await user.selectOptions(within(detail).getByLabelText('Section'), 'Drawer');

    expect(await screen.findByText('Item moved')).toBeInTheDocument();
    await vi.waitFor(() => expect(within(sheet).queryByRole('img', { name: 'Blue shirt' })).not.toBeInTheDocument());
    expect(await repository.listItems('drawer')).toHaveLength(1);
  });

  it('deletes an item after confirmation', async () => {
    const { repository, shelf, user, sheet, detail } = await openItem();

    await user.click(within(detail).getByRole('button', { name: 'Delete' }));
    await user.click(within(detail).getByRole('button', { name: 'Really delete?' }));

    expect(await within(sheet).findByText('Nothing here yet.')).toBeInTheDocument();
    expect(await repository.listItems(shelf.id)).toEqual([]);
  });
});
