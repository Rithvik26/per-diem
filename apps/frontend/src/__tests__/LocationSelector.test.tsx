import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationSelector } from '../features/LocationSelector';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('LocationSelector', () => {
  it('renders loading skeleton initially', () => {
    const { container } = renderWithProviders(<LocationSelector />);
    // Skeleton should be present while loading
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders location dropdown after loading', async () => {
    renderWithProviders(<LocationSelector />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /select restaurant location/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Downtown Restaurant/)).toBeInTheDocument();
    expect(screen.getByText(/Uptown Cafe/)).toBeInTheDocument();
  });

  it('allows user to select a location', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocationSelector />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'LOC1');

    expect(select).toHaveValue('LOC1');
  });

  it('displays placeholder option', async () => {
    renderWithProviders(<LocationSelector />);

    await waitFor(() => {
      expect(screen.getByText('Select a location...')).toBeInTheDocument();
    });
  });
});
