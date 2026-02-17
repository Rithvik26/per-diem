import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../features/SearchBar';
import { useAppStore } from '../store/app-store';

describe('SearchBar', () => {
  it('renders search input', () => {
    render(<SearchBar />);
    expect(screen.getByRole('searchbox', { name: /search for menu items/i })).toBeInTheDocument();
  });

  it('updates search query on input', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'pizza');

    expect(searchInput).toHaveValue('pizza');
    expect(useAppStore.getState().searchQuery).toBe('pizza');
  });

  it('shows clear button when query is not empty', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'burger');

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('clears search query when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'pasta');

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(useAppStore.getState().searchQuery).toBe('');
  });

  it('displays keyboard shortcut hint', () => {
    render(<SearchBar />);
    expect(screen.getByText(/cmd\+k/i)).toBeInTheDocument();
  });
});
