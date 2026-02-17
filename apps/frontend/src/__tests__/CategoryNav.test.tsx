import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryNav } from '../features/CategoryNav';
import { mockCatalog } from './mocks/data';

describe('CategoryNav', () => {
  const mockOnCategoryClick = vi.fn();

  it('renders all category buttons', () => {
    render(
      <CategoryNav categories={mockCatalog} activeCategory={null} onCategoryClick={mockOnCategoryClick} />,
    );

    expect(screen.getByRole('button', { name: /view pizza category/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view burgers category/i })).toBeInTheDocument();
  });

  it('shows item count for each category', () => {
    render(
      <CategoryNav categories={mockCatalog} activeCategory={null} onCategoryClick={mockOnCategoryClick} />,
    );

    expect(screen.getByText('(2)')).toBeInTheDocument(); // Pizza has 2 items
    expect(screen.getByText('(1)')).toBeInTheDocument(); // Burgers has 1 item
  });

  it('highlights active category', () => {
    render(
      <CategoryNav
        categories={mockCatalog}
        activeCategory="CAT_PIZZA"
        onCategoryClick={mockOnCategoryClick}
      />,
    );

    const pizzaButton = screen.getByRole('button', { name: /view pizza category/i });
    expect(pizzaButton).toHaveAttribute('aria-pressed', 'true');
    expect(pizzaButton).toHaveClass('bg-blue-600');
  });

  it('calls onCategoryClick when category is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CategoryNav categories={mockCatalog} activeCategory={null} onCategoryClick={mockOnCategoryClick} />,
    );

    const pizzaButton = screen.getByRole('button', { name: /view pizza category/i });
    await user.click(pizzaButton);

    expect(mockOnCategoryClick).toHaveBeenCalledWith('CAT_PIZZA');
  });

  it('renders nothing when categories array is empty', () => {
    const { container } = render(
      <CategoryNav categories={[]} activeCategory={null} onCategoryClick={mockOnCategoryClick} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
