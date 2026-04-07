import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';

interface BoxDetail {
  length: number;
  width: number;
  height: number;
  weight: number;
  declaredValue: number;
}

interface PackageDetailsFormData {
  boxes: BoxDetail[];
}

interface PackageDetailsFormProps {
  onSubmit: (data: PackageDetailsFormData) => void;
  className?: string;
}

export function PackageDetailsForm({
  onSubmit,
  className = '',
}: PackageDetailsFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PackageDetailsFormData>({
    defaultValues: {
      boxes: [{ length: 12, width: 12, height: 12, weight: 5, declaredValue: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'boxes',
  });

  const handleFormSubmit: SubmitHandler<PackageDetailsFormData> = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={`space-y-6 ${className}`} noValidate>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="card dark:bg-gray-800 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Package {index + 1}</h4>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  aria-label={`Remove package ${index + 1}`}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Length */}
              <div>
                <label htmlFor={`package-length-${index}`} className="label-text dark:text-gray-200">
                  Length (in)
                </label>
                <input
                  id={`package-length-${index}`}
                  type="number"
                  step="0.1"
                  min="0"
                  {...register(`boxes.${index}.length` as const, { valueAsNumber: true })}
                  className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  aria-invalid={errors.boxes?.[index]?.length ? 'true' : undefined}
                  aria-describedby={errors.boxes?.[index]?.length ? `package-length-${index}-error` : undefined}
                />
                {errors.boxes?.[index]?.length && (
                  <p id={`package-length-${index}-error`} className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
                    {errors.boxes[index]?.length?.message}
                  </p>
                )}
              </div>

              {/* Width */}
              <div>
                <label htmlFor={`package-width-${index}`} className="label-text dark:text-gray-200">
                  Width (in)
                </label>
                <input
                  id={`package-width-${index}`}
                  type="number"
                  step="0.1"
                  min="0"
                  {...register(`boxes.${index}.width` as const, { valueAsNumber: true })}
                  className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  aria-invalid={errors.boxes?.[index]?.width ? 'true' : undefined}
                  aria-describedby={errors.boxes?.[index]?.width ? `package-width-${index}-error` : undefined}
                />
                {errors.boxes?.[index]?.width && (
                  <p id={`package-width-${index}-error`} className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
                    {errors.boxes[index]?.width?.message}
                  </p>
                )}
              </div>

              {/* Height */}
              <div>
                <label htmlFor={`package-height-${index}`} className="label-text dark:text-gray-200">
                  Height (in)
                </label>
                <input
                  id={`package-height-${index}`}
                  type="number"
                  step="0.1"
                  min="0"
                  {...register(`boxes.${index}.height` as const, { valueAsNumber: true })}
                  className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  aria-invalid={errors.boxes?.[index]?.height ? 'true' : undefined}
                  aria-describedby={errors.boxes?.[index]?.height ? `package-height-${index}-error` : undefined}
                />
                {errors.boxes?.[index]?.height && (
                  <p id={`package-height-${index}-error`} className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
                    {errors.boxes[index]?.height?.message}
                  </p>
                )}
              </div>

              {/* Weight */}
              <div>
                <label htmlFor={`package-weight-${index}`} className="label-text dark:text-gray-200">
                  Weight (lbs)
                </label>
                <input
                  id={`package-weight-${index}`}
                  type="number"
                  step="0.1"
                  min="0"
                  {...register(`boxes.${index}.weight` as const, { valueAsNumber: true })}
                  className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  aria-invalid={errors.boxes?.[index]?.weight ? 'true' : undefined}
                  aria-describedby={errors.boxes?.[index]?.weight ? `package-weight-${index}-error` : undefined}
                />
                {errors.boxes?.[index]?.weight && (
                  <p id={`package-weight-${index}-error`} className="mt-1 text-sm text-red-500 dark:text-red-400" role="alert">
                    {errors.boxes[index]?.weight?.message}
                  </p>
                )}
              </div>
            </div>

            {/* Declared Value */}
            <div className="mt-4">
              <label htmlFor={`package-value-${index}`} className="label-text dark:text-gray-200">
                Declared Value ($)
              </label>
              <input
                id={`package-value-${index}`}
                type="number"
                step="0.01"
                min="0"
                {...register(`boxes.${index}.declaredValue` as const, { valueAsNumber: true })}
                className="input-field max-w-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Box Button */}
      <button
        type="button"
        onClick={() => append({ length: 12, width: 12, height: 12, weight: 5, declaredValue: 100 })}
        className="btn-secondary dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        + Add Another Package
      </button>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            'Get Shipping Rates'
          )}
        </button>
      </div>
    </form>
  );
}
