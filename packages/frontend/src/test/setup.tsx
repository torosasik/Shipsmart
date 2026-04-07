import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock React Router
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => 
    <a href={to} {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  QueryClient: vi.fn().mockImplementation(() => ({
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock zustand stores
vi.mock('../stores/useThemeStore', () => ({
  useThemeStore: vi.fn(() => ({
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  })),
}));

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

// Mock API services
vi.mock('../services/api', () => ({
  ordersApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
  shipmentsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
  returnsApi: {
    list: vi.fn(),
    get: vi.fn(),
  },
  consolidationApi: {
    opportunities: vi.fn(),
    apply: vi.fn(),
  },
  carrierSettingsApi: {
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    test: vi.fn(),
  },
  ratesApi: {
    shopRates: vi.fn(),
  },
  labelsApi: {
    create: vi.fn(),
  },
}));

// Mock axe-core
vi.mock('@axe-core/react', () => ({
  default: vi.fn(),
}));

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
