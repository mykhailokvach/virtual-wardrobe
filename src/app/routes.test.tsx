import { screen } from '@testing-library/react';
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
