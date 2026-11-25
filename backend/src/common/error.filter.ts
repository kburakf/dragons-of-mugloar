import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiProperty } from '@nestjs/swagger';
import {
  AdNotFoundError,
  GameNotFoundError,
  GameOverError,
  RateLimitedError,
  UpstreamTimeoutError,
  UpstreamUnavailableError,
} from '../mugloar/mugloar.errors';

// The one shape of every error response. The API docs use this class too.
export class ErrorBody {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  error!: string;

  @ApiProperty()
  message!: string;
}

const GAME_ERRORS = [
  { type: GameNotFoundError, statusCode: HttpStatus.NOT_FOUND, error: 'GAME_NOT_FOUND' },
  { type: AdNotFoundError, statusCode: HttpStatus.NOT_FOUND, error: 'AD_NOT_FOUND' },
  { type: GameOverError, statusCode: HttpStatus.GONE, error: 'GAME_OVER' },
  {
    type: RateLimitedError,
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    error: 'UPSTREAM_RATE_LIMITED',
  },
  {
    type: UpstreamUnavailableError,
    statusCode: HttpStatus.BAD_GATEWAY,
    error: 'UPSTREAM_UNAVAILABLE',
  },
  { type: UpstreamTimeoutError, statusCode: HttpStatus.GATEWAY_TIMEOUT, error: 'UPSTREAM_TIMEOUT' },
];

// The error names for the errors that NestJS throws, for example from the ValidationPipe.
const HTTP_ERROR_NAMES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'INVALID_INPUT',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

// Turns every error into one JSON shape: { statusCode, error, message }.
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toErrorBody(exception);

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown): ErrorBody {
    const gameError = GAME_ERRORS.find((entry) => exception instanceof entry.type);

    if (gameError && exception instanceof Error) {
      return {
        statusCode: gameError.statusCode,
        error: gameError.error,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();

      return {
        statusCode,
        error: HTTP_ERROR_NAMES[statusCode] ?? 'HTTP_ERROR',
        message: exception.message,
      };
    }

    this.logger.error(exception);

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }
}
