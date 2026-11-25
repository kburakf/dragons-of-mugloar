import { Module } from '@nestjs/common';
import { MugloarModule } from '../mugloar/mugloar.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [MugloarModule],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
