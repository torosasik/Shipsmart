/**
 * Request validation middleware.
 * Wraps express-validator to provide consistent error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';

/**
 * Validate request against express-validator rules.
 * Returns 400 with validation errors if validation fails.
 */
export function validate(
  validations: ValidationChain[],
): (req: Request, _res: Response, next: NextFunction) => void {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors: Record<string, string[]> = {};

      errors.array().forEach((error) => {
        if ('path' in error && 'msg' in error) {
          const field = error.path as string;
          const message = error.msg as string;
          if (!formattedErrors[field]) {
            formattedErrors[field] = [];
          }
          formattedErrors[field].push(message);
        }
      });

      next(
        new AppError('Validation failed', 400, {
          fields: formattedErrors,
        }),
      );
      return;
    }

    next();
  };
}
