import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

// Classes for the game API responses. The client validates every response with them.
// The same classes describe our own API in the OpenAPI docs.

export class GameStart {
  @ApiProperty() @IsString() gameId!: string;
  @ApiProperty() @IsNumber() lives!: number;
  @ApiProperty() @IsNumber() gold!: number;
  @ApiProperty() @IsNumber() level!: number;
  @ApiProperty() @IsNumber() score!: number;
  @ApiProperty() @IsNumber() highScore!: number;
  @ApiProperty() @IsNumber() turn!: number;
}

// An ad as the game sends it. With `encrypted` 1 or 2, adId, message and probability are encoded.
export class RawAd {
  @ApiProperty() @IsString() adId!: string;
  @ApiProperty() @IsString() message!: string;
  @ApiProperty() @IsNumber() reward!: number;
  @ApiProperty() @IsNumber() expiresIn!: number;
  // The game sends 1, 2, null, or no field at all.
  @ApiProperty({ type: Number, enum: [1, 2], nullable: true, required: false })
  @IsOptional()
  @IsIn([1, 2])
  encrypted?: 1 | 2 | null;
  @ApiProperty() @IsString() probability!: string;
}

// An ad after decoding. The rest of the app only sees this class.
export class Ad extends OmitType(RawAd, ['encrypted'] as const) {}

export class SolveResult {
  @ApiProperty() @IsBoolean() success!: boolean;
  @ApiProperty() @IsNumber() lives!: number;
  @ApiProperty() @IsNumber() gold!: number;
  @ApiProperty() @IsNumber() score!: number;
  @ApiProperty() @IsNumber() highScore!: number;
  @ApiProperty() @IsNumber() turn!: number;
  @ApiProperty() @IsString() message!: string;
}

export class ShopItem {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() cost!: number;
}

export class BuyResult {
  @ApiProperty() @IsBoolean() shoppingSuccess!: boolean;
  @ApiProperty() @IsNumber() gold!: number;
  @ApiProperty() @IsNumber() lives!: number;
  @ApiProperty() @IsNumber() level!: number;
  @ApiProperty() @IsNumber() turn!: number;
}

export class Reputation {
  @ApiProperty() @IsNumber() people!: number;
  @ApiProperty() @IsNumber() state!: number;
  @ApiProperty() @IsNumber() underworld!: number;
}

// The part of the game state that the strategy needs.
export interface GameState {
  lives: number;
  gold: number;
  level: number;
  score: number;
  turn: number;
}
