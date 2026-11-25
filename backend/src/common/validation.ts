import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

// Gives one readable message for each failed rule.
export function listProblems(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

// Used by the global ValidationPipe. The 400 response gets one message string.
export function toBadRequest(errors: ValidationError[]): BadRequestException {
  return new BadRequestException(listProblems(errors).join('; '));
}
