// Plays games with the bot from the command line, without the web server.
// Usage: npm run bot -- --games 20 --max-turns 200
// Long run: npm run bot -- --games 1 --max-turns 100000 --progress-every 500
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { plainToInstance, Type } from 'class-transformer';
import { IsInt, Max, Min, validateSync } from 'class-validator';
import { DEFAULT_MAX_TURNS, GameResult, playGame } from './bot/play-game';
import { listProblems } from './common/validation';
import { loadConfig } from './config';
import { MugloarClient } from './mugloar/mugloar.client';

const TARGET_SCORE = 1_000;
// Pause between two games, to be polite to the shared game API.
const PAUSE_BETWEEN_GAMES_MS = 2_000;

// The command line arguments are strings, so @Type turns them into numbers.
class CliArgs {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000)
  games: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  maxTurns: number = DEFAULT_MAX_TURNS;

  // Print a progress line every N turns. 0 prints no progress lines.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  progressEvery: number = 0;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      games: { type: 'string' },
      'max-turns': { type: 'string' },
      'progress-every': { type: 'string' },
    },
  });
  // exposeDefaultValues keeps the default when an argument is missing.
  const args = plainToInstance(
    CliArgs,
    {
      games: values.games,
      maxTurns: values['max-turns'],
      progressEvery: values['progress-every'],
    },
    { exposeDefaultValues: true },
  );
  const errors = validateSync(args, { whitelist: true });

  if (errors.length > 0) {
    console.error(`Invalid arguments:\n${listProblems(errors).join('\n')}`);
    process.exitCode = 1;

    return;
  }

  const { games, maxTurns, progressEvery } = args;

  const client = new MugloarClient({ baseUrl: loadConfig().MUGLOAR_BASE_URL });
  const results: GameResult[] = [];
  let failedGames = 0;

  console.log(`Playing ${games} game(s), max ${maxTurns} turns each.`);

  for (let game = 1; game <= games; game++) {
    if (game > 1) {
      await sleep(PAUSE_BETWEEN_GAMES_MS);
    }

    try {
      let started = false;
      const result = await playGame(client, { maxTurns }, (event) => {
        if (!started) {
          started = true;
          console.log(`Game ${game}/${games} started: ${event.gameId}`);
        }

        if (progressEvery > 0 && event.turn % progressEvery === 0) {
          console.log(
            `  turn ${event.turn}: level ${event.level}, lives ${event.lives}, ` +
              `gold ${event.gold}, score ${event.score}`,
          );
        }
      });

      results.push(result);
      console.log(
        `Game ${game}/${games} ${result.gameId}: score ${result.score}, turn ${result.turn}, ` +
          `level ${result.level}, lives ${result.lives}, gold ${result.gold} (${result.stopReason})`,
      );
    } catch (error) {
      failedGames++;
      console.log(
        `Game ${game}/${games} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  printSummary(results, failedGames);
}

function printSummary(results: GameResult[], failedGames: number): void {
  const scores = results.map((result) => result.score).sort((a, b) => a - b);

  if (scores.length === 0) {
    console.log(`No game finished. Failed games: ${failedGames}.`);

    return;
  }

  const passed = scores.filter((score) => score >= TARGET_SCORE).length;

  console.log(
    `Summary: games ${scores.length}, min ${scores[0]}, median ${median(scores)}, ` +
      `max ${scores[scores.length - 1]}, games >= ${TARGET_SCORE}: ${passed}/${scores.length}, ` +
      `failed: ${failedGames}`,
  );
}

// The input must be sorted.
function median(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle]!;
  }

  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

void main();
