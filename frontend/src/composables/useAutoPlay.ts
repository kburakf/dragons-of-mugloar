import { onScopeDispose, ref } from 'vue';
import type { Advice } from '../api/types';
import { useGameStore } from '../stores/game';

// The time of one auto-play step in milliseconds: first show the move, then run it.
export const STEP_MS = { slow: 1500, normal: 700, fast: 250 } as const;
export type Speed = keyof typeof STEP_MS;

// The part of a step that shows the move before it runs.
const SHOW_SHARE = 0.4;
const MIN_SHOW_MS = 150;

export const STOPPED = 'Auto-play stopped.';
export const STOPPED_GAME_OVER = 'Auto-play stopped: the game is over.';
export const STOPPED_NO_ADVICE = 'Auto-play stopped: the backend has no advice.';
export const STOPPED_ERROR = 'Auto-play stopped because of an error.';

// Auto-play follows the advice of the backend, one step at a time.
// The strategy stays in the backend. This code only runs the advised move
// with the same store action that a click runs, so the screen changes in the same way.
export function useAutoPlay() {
  const game = useGameStore();
  const running = ref(false);
  const speed = ref<Speed>('normal');
  // The move that auto-play shows now, just before it runs it. The cards use it to glow.
  const move = ref<Advice | null>(null);
  // A short text for the status line. Null before the first start.
  const status = ref<string | null>(null);
  // Only one timer at a time. Stop clears it.
  let timer: ReturnType<typeof setTimeout> | undefined;

  function showMs(): number {
    return Math.max(MIN_SHOW_MS, Math.round(STEP_MS[speed.value] * SHOW_SHARE));
  }

  function start() {
    if (running.value || game.loading) return;
    running.value = true;
    status.value = 'Following the advice.';
    showNextMove();
  }

  function stop(reason = STOPPED) {
    clearTimeout(timer);
    timer = undefined;
    move.value = null;
    if (!running.value) return;
    running.value = false;
    status.value = reason;
  }

  // Step, part 1: read the advice and show it.
  function showNextMove() {
    if (game.gameOver) return stop(STOPPED_GAME_OVER);
    if (!game.advice) return stop(STOPPED_NO_ADVICE);
    move.value = game.advice;
    timer = setTimeout(() => void runMove(), showMs());
  }

  // Step, part 2: run the move. The next step starts only after this request ends,
  // so two actions never run at the same time.
  async function runMove() {
    const advice = move.value;

    if (!advice) return;

    if (advice.type === 'solve') {
      await game.solve(advice.adId, true);
    } else {
      await game.buy(advice.itemId, true);
    }

    // The user pressed Stop while the request ran.
    if (!running.value) return;
    move.value = null;
    if (game.error) return stop(STOPPED_ERROR);
    if (game.gameOver) return stop(STOPPED_GAME_OVER);
    timer = setTimeout(showNextMove, STEP_MS[speed.value] - showMs());
  }

  // The component unmounts: no timer may stay.
  onScopeDispose(() => stop());

  return { running, speed, move, status, start, stop };
}
