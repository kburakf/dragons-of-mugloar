import { INestApplication, ValidationPipe } from '@nestjs/common';
import { setUpApiDocs } from './common/api-docs';
import { ErrorFilter } from './common/error.filter';
import { toBadRequest } from './common/validation';
import { AppConfig } from './config';

// Shared by main.ts and the tests, so the tests run the same app as production.
export function setUpApp(app: INestApplication, config: AppConfig): void {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ErrorFilter());
  // whitelist removes the properties that have no validation rule.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, exceptionFactory: toBadRequest }));
  app.enableCors({ origin: config.FRONTEND_ORIGIN });
  app.enableShutdownHooks();
  setUpApiDocs(app);
}
