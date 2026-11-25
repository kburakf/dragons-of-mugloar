import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Ad, Reputation } from '../mugloar/mugloar.schemas';

// The response shapes of our own API. The API docs are made from these classes.

export class AdView extends Ad {
  @ApiProperty({ description: 'Measured success rate of the difficulty label (0 to 1)' })
  successRate!: number;

  @ApiProperty({ description: 'reward * successRate' })
  expectedValue!: number;

  @ApiProperty({
    description: 'True for a "Steal super awesome diamond" ad, which always fails',
  })
  isTrap!: boolean;

  @ApiProperty({
    type: Reputation,
    nullable: true,
    description: 'Reputation change after a success. Null for an ad type that we did not measure',
  })
  reputationEffect!: Reputation | null;
}

export class SolveAction {
  @ApiProperty({ enum: ['solve'] })
  type!: 'solve';

  @ApiProperty()
  adId!: string;
}

export class BuyAction {
  @ApiProperty({ enum: ['buy'] })
  type!: 'buy';

  @ApiProperty()
  itemId!: string;
}

@ApiExtraModels(SolveAction, BuyAction)
export class AdsResponse {
  @ApiProperty({ type: [AdView] })
  ads!: AdView[];

  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(SolveAction) }, { $ref: getSchemaPath(BuyAction) }],
    nullable: true,
    description:
      'The next action of the bot strategy. Null for a game that the backend does not know',
  })
  advice!: SolveAction | BuyAction | null;
}
