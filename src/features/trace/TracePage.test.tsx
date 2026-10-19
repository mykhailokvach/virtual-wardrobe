import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestRepository, testPhoto } from '../../test/fixtures';
import { renderRoute } from '../../test/render';

describe('TracePage', () => {
  it('aligns hand-drawn sections and saves them on Done', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());
    // One column drawn slightly crooked: left edges 0.10/0.11, right edges 0.40/0.39.
    await repository.saveSections(
      wardrobe.id,
      [
        { id: 'top', rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.2 } },
        { id: 'bottom', rect: { x: 0.11, y: 0.35, w: 0.28, h: 0.2 } },
      ],
      {},
    );

    const { user, router } = renderRoute(`/wardrobes/${wardrobe.id}/edit`, { repository });

    await user.click(await screen.findByRole('button', { name: 'Align' }));
    expect(await screen.findByText('Sections aligned')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/wardrobes/${wardrobe.id}`));
    const [top, bottom] = await repository.listSections(wardrobe.id);
    for (const section of [top, bottom]) {
      expect(section.rect.x).toBeCloseTo(0.105);
      expect(section.rect.w).toBeCloseTo(0.29);
    }
  });

  it('says so when there is nothing to align', async () => {
    const repository = createTestRepository();
    const wardrobe = await repository.createWardrobe('Closet', testPhoto());
    await repository.saveSections(
      wardrobe.id,
      [
        { id: 'a', rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.2 } },
        { id: 'b', rect: { x: 0.5, y: 0.5, w: 0.3, h: 0.2 } },
      ],
      {},
    );

    const { user } = renderRoute(`/wardrobes/${wardrobe.id}/edit`, { repository });

    await user.click(await screen.findByRole('button', { name: 'Align' }));
    expect(await screen.findByText('Already aligned')).toBeInTheDocument();
  });
});
