import { Module } from '@nestjs/common';
import { loadConfig } from '../config';
import { MugloarClient } from './mugloar.client';

@Module({
  providers: [
    {
      provide: MugloarClient,
      useFactory: () => new MugloarClient({ baseUrl: loadConfig().MUGLOAR_BASE_URL }),
    },
  ],
  exports: [MugloarClient],
})
export class MugloarModule {}
