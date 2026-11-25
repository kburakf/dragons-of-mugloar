import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setUpApp } from './app.setup';
import { loadConfig } from './config';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);

  setUpApp(app, config);
  await app.listen(config.PORT);
}

void bootstrap();
