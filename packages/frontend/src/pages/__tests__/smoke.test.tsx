/**
 * Smoke Tests for Frontend Components
 * 
 * These tests verify that key components render correctly and basic functionality works.
 * They serve as a quick sanity check before running more comprehensive tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the components/pages we need to test
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  QueryClient: vi.fn(),
}));

vi.mock('../services/api', () => ({
  ordersApi: {
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    get: vi.fn(),
    create: vi.fn(),
  },
  shipmentsApi: {
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    get: vi.fn(),
    create: vi.fn(),
  },
  returnsApi: {
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    get: vi.fn(),
  },
  consolidationApi: {
    opportunities: vi.fn(() => Promise.resolve({ data: [] })),
    apply: vi.fn(),
  },
  carrierSettingsApi: {
    list: vi.fn(() => Promise.resolve({ data: [] })),
    get: vi.fn(),
    update: vi.fn(),
    test: vi.fn(),
  },
  ratesApi: {
    shopRates: vi.fn(),
  },
}));

// Import components after mocking
import { AddressForm } from '../../components/forms/AddressForm';
import { PackageDetailsForm } from '../../components/forms/PackageDetailsForm';
import { DashboardCard } from '../../components/DashboardCard';
import { LoadingSpinner, ErrorDisplay } from '../../components/LoadingSpinner';
import type { Address } from '../../types';

// ============================================================================
// Smoke Tests: AddressForm Component
// ============================================================================

describe('AddressForm - Smoke Tests', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders all form fields correctly', () => {
    render(<AddressForm onSubmit={mockOnSubmit} />);

    // Check for required fields
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Street Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ZIP Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
  });

  it('renders optional fields correctly', () => {
    render(<AddressForm onSubmit={mockOnSubmit} />);

    // Check for optional fields
    expect(screen.getByLabelText(/Apartment, Suite/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<AddressForm onSubmit={mockOnSubmit} />);

    // Submit without filling any fields
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Street address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/City is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const testAddress: Address = {
      name: 'John Doe',
      street1: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    };

    render(<AddressForm onSubmit={mockOnSubmit} />);

    // Fill in the form
    await user.type(screen.getByLabelText(/Full Name/i), testAddress.name);
    await user.type(screen.getByLabelText(/Street Address/i), testAddress.street1);
    await user.type(screen.getByLabelText(/City/i), testAddress.city);
    await user.type(screen.getByLabelText(/State/i), testAddress.state);
    await user.type(screen.getByLabelText(/ZIP Code/i), testAddress.zip);

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    // Verify submission
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: testAddress.name,
          street1: testAddress.street1,
          city: testAddress.city,
          state: testAddress.state,
          zip: testAddress.zip,
        })
      );
    });
  });

  it('respects loading state', () => {
    render(<AddressForm onSubmit={mockOnSubmit} isLoading={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/Submitting/i);
  });

  it('accepts custom submit label', () => {
    render(<AddressForm onSubmit={mockOnSubmit} submitLabel="Save Address" />);

    expect(screen.getByRole('button', { name: /Save Address/i })).toBeInTheDocument();
  });
});

// ============================================================================
// Smoke Tests: PackageDetailsForm Component
// ============================================================================

describe('PackageDetailsForm - Smoke Tests', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders package form with default values', () => {
    render(<PackageDetailsForm onSubmit={mockOnSubmit} />);

    // Check for package fields
    expect(screen.getByLabelText(/Length/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Width/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Height/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Declared Value/i)).toBeInTheDocument();
  });

  it('has default package values', () => {
    render(<PackageDetailsForm onSubmit={mockOnSubmit} />);

    const lengthInput = screen.getByLabelText(/Length/i) as HTMLInputElement;
    expect(lengthInput.value).toBe('12');
  });

  it('allows adding more packages', async () => {
    const user = userEvent.setup();
    render(<PackageDetailsForm onSubmit={mockOnSubmit} />);

    // Click add package button
    const addButton = screen.getByRole('button', { name: /\+ Add Another Package/i });
    await user.click(addButton);

    // Should now have 2 packages
    expect(screen.getAllByText(/Package 1/i)).toHaveLength(1);
    expect(screen.getAllByText(/Package 2/i)).toHaveLength(1);
  });

  it('allows removing packages when multiple exist', async () => {
    const user = userEvent.setup();
    render(<PackageDetailsForm onSubmit={mockOnSubmit} />);

    // Add a second package
    const addButton = screen.getByRole('button', { name: /\+ Add Another Package/i });
    await user.click(addButton);

    // Remove the first package
    const removeButton = screen.getAllByRole('button', { name: /Remove/i })[0];
    await user.click(removeButton);

    // Should only have 1 package now (Package 2 became Package 1)
    expect(screen.getAllByText(/Package 1/i)).toHaveLength(1);
  });

  it('submits package data correctly', async () => {
    const user = userEvent.setup();
    render(<PackageDetailsForm onSubmit={mockOnSubmit} />);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Get Shipping Rates/i });
    await user.click(submitButton);

    // Verify submission with default values
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        boxes: [
          expect.objectContaining({
            length: 12,
            width: 12,
            height: 12,
            weight: 5,
            declaredValue: 100,
          }),
        ],
      });
    });
  });

  it('handles form submission without crashing', async () => {
    // Simulate slow submission
    mockOnSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const user = userEvent.setup();
    render(<PackageDetailsForm onSubmit={mockOnSubmit} />);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Get Shipping Rates/i });
    await user.click(submitButton);

    // The form should submit without crashing
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});

// ============================================================================
// Smoke Tests: DashboardCard Component
// ============================================================================

describe('DashboardCard - Smoke Tests', () => {
  it('renders with title, value, and subtitle', () => {
    render(
      <DashboardCard
        title="Test Title"
        value={42}
        subtitle="Test subtitle"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    render(
      <DashboardCard
        title="Savings"
        value="$1,234.56"
        subtitle="This month"
      />
    );

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });

  it('handles zero value', () => {
    render(
      <DashboardCard
        title="Orders"
        value={0}
        subtitle="No pending orders"
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

// ============================================================================
// Smoke Tests: LoadingSpinner Component
// ============================================================================

describe('LoadingSpinner - Smoke Tests', () => {
  it('renders spinner with default props', () => {
    render(<LoadingSpinner />);

    // Should have a spinning animation
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Loading data..." />);

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });
});

// ============================================================================
// Smoke Tests: ErrorDisplay Component
// ============================================================================

describe('ErrorDisplay - Smoke Tests', () => {
  it('renders error message correctly', () => {
    render(
      <ErrorDisplay
        title="Error Title"
        message="An error occurred"
      />
    );

    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const mockRetry = vi.fn();
    render(
      <ErrorDisplay
        title="Error"
        message="Something went wrong"
        onRetry={mockRetry}
      />
    );

    // Button text is "Try Again" not "Retry"
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
