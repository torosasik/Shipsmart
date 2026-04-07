import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Address } from '../../types';

const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP code required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().optional(),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSubmit: (data: Address) => void;
  defaultValues?: Partial<Address>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function AddressForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  submitLabel = 'Submit',
}: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: 'US',
      ...defaultValues,
    },
  });

  const handleFormSubmit = (data: AddressFormData) => {
    onSubmit(data as Address);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
      {/* Full Name */}
      <div>
        <label htmlFor="address-name" className="label-text dark:text-gray-200">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          id="address-name"
          type="text"
          className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="John Doe"
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'address-name-error' : undefined}
        />
        {errors.name && (
          <p id="address-name-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Street Address */}
      <div>
        <label htmlFor="address-street1" className="label-text dark:text-gray-200">
          Street Address <span className="text-red-500">*</span>
        </label>
        <input
          {...register('street1')}
          id="address-street1"
          type="text"
          className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="123 Main St"
          aria-invalid={errors.street1 ? 'true' : undefined}
          aria-describedby={errors.street1 ? 'address-street1-error' : undefined}
        />
        {errors.street1 && (
          <p id="address-street1-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
            {errors.street1.message}
          </p>
        )}
      </div>

      {/* Apartment, Suite, etc. */}
      <div>
        <label htmlFor="address-street2" className="label-text dark:text-gray-200">
          Apartment, Suite, etc. <span className="text-gray-400">(optional)</span>
        </label>
        <input
          {...register('street2')}
          id="address-street2"
          type="text"
          className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Apt 4B"
        />
      </div>

      {/* City and State */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="address-city" className="label-text dark:text-gray-200">
            City <span className="text-red-500">*</span>
          </label>
          <input
            {...register('city')}
            id="address-city"
            type="text"
            className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="New York"
            aria-invalid={errors.city ? 'true' : undefined}
            aria-describedby={errors.city ? 'address-city-error' : undefined}
          />
          {errors.city && (
            <p id="address-city-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
              {errors.city.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="address-state" className="label-text dark:text-gray-200">
            State <span className="text-red-500">*</span>
          </label>
          <input
            {...register('state')}
            id="address-state"
            type="text"
            className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="NY"
            aria-invalid={errors.state ? 'true' : undefined}
            aria-describedby={errors.state ? 'address-state-error' : undefined}
          />
          {errors.state && (
            <p id="address-state-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
              {errors.state.message}
            </p>
          )}
        </div>
      </div>

      {/* ZIP and Country */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="address-zip" className="label-text dark:text-gray-200">
            ZIP Code <span className="text-red-500">*</span>
          </label>
          <input
            {...register('zip')}
            id="address-zip"
            type="text"
            className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="10001"
            aria-invalid={errors.zip ? 'true' : undefined}
            aria-describedby={errors.zip ? 'address-zip-error' : undefined}
          />
          {errors.zip && (
            <p id="address-zip-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
              {errors.zip.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="address-country" className="label-text dark:text-gray-200">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            {...register('country')}
            id="address-country"
            className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            aria-invalid={errors.country ? 'true' : undefined}
          >
            <option value="US">United States</option>
          </select>
        </div>
      </div>

      {/* Phone and Email */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="address-phone" className="label-text dark:text-gray-200">
            Phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            {...register('phone')}
            id="address-phone"
            type="tel"
            className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label htmlFor="address-email" className="label-text dark:text-gray-200">
            Email <span className="text-gray-400">(optional)</span>
          </label>
          <input
            {...register('email')}
            id="address-email"
            type="email"
            className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="john@example.com"
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'address-email-error' : undefined}
          />
          {errors.email && (
            <p id="address-email-error" className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
