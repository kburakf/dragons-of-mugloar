import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

// Game, ad and item ids from the game API are short and alphanumeric (for example "MINfYAOW").
// The check also keeps unexpected characters out of the upstream URL.
const ID_PATTERN = /^[A-Za-z0-9]{1,40}$/;
const ID_MESSAGE = (args: { property: string }) =>
  `${args.property}: Must be 1-40 letters or digits`;

export class GameParams {
  @ApiProperty({ example: 'MINfYAOW' })
  @Matches(ID_PATTERN, { message: ID_MESSAGE })
  gameId!: string;
}

export class AdParams extends GameParams {
  @ApiProperty({ example: 'Tm5SZ2pF' })
  @Matches(ID_PATTERN, { message: ID_MESSAGE })
  adId!: string;
}

export class ItemParams extends GameParams {
  @ApiProperty({ example: 'hpot' })
  @Matches(ID_PATTERN, { message: ID_MESSAGE })
  itemId!: string;
}
