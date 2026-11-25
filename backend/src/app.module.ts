import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { GamesModule } from './games/games.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Used on POST /api/games: 10 new games per minute for each client IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    GamesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
