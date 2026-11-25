import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiErrors, GAME_ERROR_STATUSES } from '../common/api-docs';
import {
  BuyResult,
  GameStart,
  Reputation,
  ShopItem,
  SolveResult,
} from '../mugloar/mugloar.schemas';
import { AdsResponse } from './games.schemas';
import { AdParams, GameParams, ItemParams } from './games.params';
import { GamesService } from './games.service';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  // Each new game is a call to the shared game API, so we limit how often a client can start one.
  @Post()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Start a new game (10 per minute for each client)' })
  @ApiCreatedResponse({ type: GameStart, description: 'The new game' })
  @ApiErrors([HttpStatus.TOO_MANY_REQUESTS, HttpStatus.BAD_GATEWAY, HttpStatus.GATEWAY_TIMEOUT])
  start(): Promise<GameStart> {
    return this.games.start();
  }

  @Get(':gameId/ads')
  @ApiOperation({ summary: 'List the ads and the advised next action. Does not spend a turn' })
  @ApiOkResponse({ type: AdsResponse, description: 'The ads and the advice' })
  @ApiErrors(GAME_ERROR_STATUSES)
  getAds(@Param() params: GameParams): Promise<AdsResponse> {
    return this.games.getAds(params.gameId);
  }

  @Post(':gameId/ads/:adId/solve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solve an ad. Spends a turn' })
  @ApiOkResponse({ type: SolveResult, description: 'The result. A failure costs 1 life' })
  @ApiErrors(GAME_ERROR_STATUSES)
  solveAd(@Param() params: AdParams): Promise<SolveResult> {
    return this.games.solveAd(params.gameId, params.adId);
  }

  @Get(':gameId/shop')
  @ApiOperation({ summary: 'List the shop items. Does not spend a turn' })
  @ApiOkResponse({ type: [ShopItem], description: 'The shop items' })
  @ApiErrors(GAME_ERROR_STATUSES)
  getShop(@Param() params: GameParams): Promise<ShopItem[]> {
    return this.games.getShop(params.gameId);
  }

  @Post(':gameId/shop/:itemId/buy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buy an item. Spends a turn, also when the gold is not enough' })
  @ApiOkResponse({
    type: BuyResult,
    description: 'The result. shoppingSuccess is false without enough gold',
  })
  @ApiErrors(GAME_ERROR_STATUSES)
  buyItem(@Param() params: ItemParams): Promise<BuyResult> {
    return this.games.buyItem(params.gameId, params.itemId);
  }

  @Post(':gameId/reputation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Investigate the reputation. Spends a turn' })
  @ApiOkResponse({ type: Reputation, description: 'The reputation' })
  @ApiErrors(GAME_ERROR_STATUSES)
  investigateReputation(@Param() params: GameParams): Promise<Reputation> {
    return this.games.investigateReputation(params.gameId);
  }
}
