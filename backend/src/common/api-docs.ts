import { applyDecorators, HttpStatus, INestApplication } from '@nestjs/common';
import { ApiResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ErrorBody } from './error.filter';

// OpenAPI docs at /api/docs (Swagger UI) and /api/docs-json.
// The response schemas come from the classes that the code uses, so the docs cannot drift.

const ERROR_DESCRIPTIONS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'INVALID_INPUT: an id is not 1-40 letters or digits',
  [HttpStatus.NOT_FOUND]:
    'GAME_NOT_FOUND, or AD_NOT_FOUND (the ad is not valid, expired or already solved)',
  [HttpStatus.GONE]: 'GAME_OVER',
  [HttpStatus.TOO_MANY_REQUESTS]:
    'UPSTREAM_RATE_LIMITED, or TOO_MANY_REQUESTS (more than 10 new games per minute)',
  [HttpStatus.BAD_GATEWAY]:
    'UPSTREAM_UNAVAILABLE: the game API is down or sent an unexpected reply',
  [HttpStatus.GATEWAY_TIMEOUT]: 'UPSTREAM_TIMEOUT: the game API did not answer in time',
};

// The errors that every call to the game API can give.
export const GAME_ERROR_STATUSES = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.NOT_FOUND,
  HttpStatus.GONE,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.BAD_GATEWAY,
  HttpStatus.GATEWAY_TIMEOUT,
];

export function ApiErrors(statuses: number[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({ status, description: ERROR_DESCRIPTIONS[status], type: ErrorBody }),
    ),
  );
}

export function setUpApiDocs(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Dragons of Mugloar API')
    .setDescription(
      'Plays the Dragons of Mugloar game through the game API, and advises the next move. ' +
        'Every error has the shape { statusCode, error, message }.',
    )
    .setVersion('1.0')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
}
