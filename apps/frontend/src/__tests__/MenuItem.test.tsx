import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuItem } from '../features/MenuItem';
import type { MenuItem as MenuItemType } from '@per-diem/shared-types';

const mockItem: MenuItemType = {
  id: 'ITEM1',
  name: 'Margherita Pizza',
  description: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil. A timeless favorite that never goes out of style. Perfect for sharing or enjoying on your own.',
  category: 'Pizza',
  image_url: 'https://example.com/pizza.jpg',
  variations: [
    {
      id: 'VAR1',
      name: 'Small',
      priceDollars: 12.5,
      priceFormatted: '$12.50',
    },
    {
      id: 'VAR2',
      name: 'Large',
      priceDollars: 18.5,
      priceFormatted: '$18.50',
    },
  ],
};

describe('MenuItem', () => {
  it('renders item name', () => {
    render(<MenuItem item={mockItem} />);
    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(<MenuItem item={mockItem} />);
    expect(screen.getByText('Pizza')).toBeInTheDocument();
  });

  it('renders all variations with prices', () => {
    render(<MenuItem item={mockItem} />);
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByText('$18.50')).toBeInTheDocument();
  });

  it('truncates long descriptions initially', () => {
    render(<MenuItem item={mockItem} />);
    const description = screen.getByText(/Classic Italian pizza/);
    expect(description.textContent?.length).toBeLessThan(mockItem.description!.length);
  });

  it('expands description when "Read more" is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuItem item={mockItem} />);

    const readMoreButton = screen.getByRole('button', { name: /read more/i });
    await user.click(readMoreButton);

    expect(screen.getByText(/Perfect for sharing or enjoying on your own/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /read less/i })).toBeInTheDocument();
  });

  it('renders image when image_url is provided', () => {
    render(<MenuItem item={mockItem} />);
    const image = screen.getByRole('img', { name: 'Margherita Pizza' });
    expect(image).toHaveAttribute('src', 'https://example.com/pizza.jpg');
  });

  it('renders placeholder icon when image_url is missing', () => {
    const itemWithoutImage = { ...mockItem, image_url: undefined };
    render(<MenuItem item={itemWithoutImage} />);
    // SVG placeholder should be rendered
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
