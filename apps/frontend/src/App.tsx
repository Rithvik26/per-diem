import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MenuGrid } from './features/MenuGrid';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Header />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
            <MenuGrid />
          </main>

          <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} Per Diem. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
