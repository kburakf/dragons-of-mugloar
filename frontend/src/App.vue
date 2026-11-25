<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import ActionLog from './components/ActionLog.vue';
import AdList from './components/AdList.vue';
import AppHeader from './components/AppHeader.vue';
import AutoPlayControls from './components/AutoPlayControls.vue';
import GameOver from './components/GameOver.vue';
import PlayTips from './components/PlayTips.vue';
import ReputationBox from './components/ReputationBox.vue';
import ShopPanel from './components/ShopPanel.vue';
import StatusBar from './components/StatusBar.vue';
import TabBar from './components/TabBar.vue';
import wyvern from './assets/wyvern.svg';
import { useAutoPlay } from './composables/useAutoPlay';
import { useGameStore } from './stores/game';

const game = useGameStore();
// reactive() unwraps the refs, so the code reads auto.running, not auto.running.value.
const auto = reactive(useAutoPlay());

// The page fits the screen, so it never scrolls. Desktop shows all game sections.
// A phone has 3 tabs, because the game sections do not fit.
type View = 'quests' | 'shop' | 'log';
const view = ref<View>('quests');

const PHONE_TABS = [
  { id: 'quests', label: 'Quests', panel: 'panel-play' },
  { id: 'shop', label: 'Shop', panel: 'panel-play' },
  { id: 'log', label: 'Chronicle', panel: 'panel-play' },
];

const canStartAuto = computed(() => !game.gameOver && !game.loading && game.advice !== null);

// A click on a game button takes the control back: it stops auto-play first.
// Auto-play waits for its own request to end, so the click never runs at the same time.
function manual(action: () => unknown) {
  auto.stop();
  void action();
}

const helpDialog = ref<HTMLDialogElement | null>(null);
</script>

<template>
  <main class="page" :class="`view-${view}`">
    <AppHeader>
      <button type="button" class="small" @click="helpDialog?.showModal()">How to play</button>
    </AppHeader>

    <TabBar
      class="phone-tabs"
      :tabs="PHONE_TABS"
      :model-value="view"
      label="Sections"
      @update:model-value="view = $event as View"
    />

    <p v-if="game.error" class="banner" role="alert">{{ game.error }}</p>

    <div
      id="panel-play"
      class="play"
      :class="{ 'game-over': game.gameOver }"
      role="tabpanel"
      aria-label="Game"
    >
      <section v-if="!game.player" class="start panel">
        <img class="hero" :src="wyvern" alt="" width="160" height="160" />
        <p class="start-title">A new season of quests waits on the board.</p>
        <p>Start a game to see the ads and the shop.</p>
        <button type="button" class="primary big" :disabled="game.loading" @click="game.start()">
          {{ game.loading ? 'Starting...' : 'Start game' }}
        </button>
      </section>

      <template v-else>
        <StatusBar :player="game.player">
          <AutoPlayControls
            v-model:speed="auto.speed"
            :running="auto.running"
            :can-start="canStartAuto"
            :status="auto.status"
            @start="auto.start()"
            @stop="auto.stop()"
          />
        </StatusBar>
        <ActionLog :entries="game.log" :compact="view !== 'log'" />

        <GameOver
          v-if="game.gameOver"
          :player="game.player"
          :busy="game.loading"
          @new-game="manual(game.start)"
        />

        <template v-else>
          <AdList
            :ads="game.ads"
            :advice="game.advice"
            :busy="game.loading"
            :auto-move="auto.move"
            @solve="manual(() => game.solve($event))"
            @refresh="manual(game.refreshAds)"
          />
          <!-- One box for the shop tab on a phone. On desktop it makes no box. -->
          <div class="side">
            <ShopPanel
              :items="game.shop"
              :gold="game.player.gold"
              :advice="game.advice"
              :busy="game.loading"
              :auto-move="auto.move"
              @buy="manual(() => game.buy($event))"
            />
            <ReputationBox
              :reputation="game.reputation"
              :previous="game.previousReputation"
              :expected-change="game.expectedChange"
              :solved-since-check="game.solvedSinceCheck"
              :busy="game.loading"
              @investigate="manual(game.investigate)"
            />
          </div>
        </template>
      </template>
    </div>

    <footer class="credits">
      Dragon icons by Lorc and Delapouite,
      <a href="https://game-icons.net" rel="noopener">game-icons.net</a>, CC BY 3.0.
    </footer>

    <!-- A native modal dialog: it keeps the focus inside, and Esc closes it. -->
    <dialog ref="helpDialog" class="help" aria-labelledby="help-title">
      <div class="help-head">
        <h2 id="help-title">How to play</h2>
        <button type="button" class="small" @click="helpDialog?.close()">Close</button>
      </div>
      <PlayTips />
      <p class="help-credits">Dragon icons by Lorc and Delapouite, game-icons.net, CC BY 3.0.</p>
    </dialog>
  </main>
</template>

<style scoped>
/* The page is exactly as high as the screen. Panels that are too long scroll inside. */
.page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  height: 100vh;
  height: 100dvh;
  max-width: 100rem;
  margin: 0 auto;
  padding: var(--space-3) var(--space-4);
  overflow: hidden;
}

.header {
  grid-area: header;
}

.phone-tabs {
  grid-area: tabs;
}

.play {
  grid-area: main;
  min-height: 0;
}

.credits {
  grid-area: credits;
  color: var(--color-muted);
  font-size: 0.8rem;
  text-align: center;
}

.credits a {
  color: var(--color-gold);
}

/* An error shows as a toast at the bottom, so it does not move the grid. */
.banner {
  position: fixed;
  bottom: var(--space-4);
  left: 50%;
  z-index: 10;
  width: min(90vw, 36rem);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  transform: translateX(-50%);
  border: 1px solid var(--color-bad);
  border-radius: var(--radius);
  background: var(--color-bad-bg);
  color: var(--color-bad);
  font-weight: 600;
  box-shadow: var(--shadow);
}

/* The game: the panels are placed in a grid. */
.play {
  display: grid;
  gap: var(--space-3);
}

.start {
  display: grid;
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  align-content: center;
  justify-items: center;
  overflow-y: auto;
  text-align: center;
  background:
    radial-gradient(ellipse at 50% 100%, rgb(232 116 59 / 25%), transparent 70%),
    var(--color-surface);
}

.start p {
  margin: 0 0 var(--space-3);
  color: var(--color-muted);
}

.start .start-title {
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 1.25rem;
}

.hero {
  display: block;
  width: 7rem;
  height: 7rem;
  margin: 0 auto var(--space-3);
  filter: drop-shadow(0 0 16px rgb(232 116 59 / 60%));
}

/* The "How to play" dialog: a parchment sheet over a dark backdrop. */
.help {
  width: min(92vw, 52rem);
  max-height: 85dvh;
  padding: var(--space-4);
  border: 1px solid var(--parchment-edge);
  border-radius: var(--radius);
  background: linear-gradient(180deg, var(--parchment), var(--parchment-edge));
  color: var(--ink);
  box-shadow: var(--shadow);
}

.help::backdrop {
  background: rgb(0 0 0 / 65%);
}

.help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.help h2 {
  margin: 0;
  color: var(--ink);
}

.help h2::after {
  content: none;
}

.help-credits {
  margin: var(--space-3) 0 0;
  color: var(--ink-muted);
  font-size: 0.8rem;
}

/*
 * Desktop: the game has 3 columns.
 * Left: shop. Middle: quest board. Right: reputation, with the chronicle under it.
 * The chronicle grows with each action, so it takes the free space and scrolls inside.
 */
@media (min-width: 900px) {
  .page {
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas: 'header' 'main' 'credits';
  }

  .phone-tabs {
    display: none;
  }

  .play {
    grid-template-columns: 18rem minmax(0, 1fr) 18rem;
    /* The reputation takes at most 55% of the height, so the chronicle always has space. */
    grid-template-rows: auto fit-content(55%) minmax(0, 1fr);
    grid-template-areas:
      'hud hud hud'
      'shop board rep'
      'shop board log';
  }

  /* At game over, the end screen takes the place of the shop and the board. */
  .play.game-over {
    grid-template-areas:
      'hud hud hud'
      'board board log'
      'board board log';
  }

  /* The shop and the reputation go into the grid of .play directly. */
  .side {
    display: contents;
  }

  .status {
    grid-area: hud;
  }

  .board,
  .over {
    grid-area: board;
  }

  .shop {
    grid-area: shop;
  }

  .chronicle {
    grid-area: log;
    min-height: 0;
    overflow-y: auto;
  }

  .reputation {
    grid-area: rep;
    align-self: start;
    max-height: 100%;
    overflow-y: auto;
  }
}

/* Phone and tablet: the HUD, the newest chronicle entry, then the section of the tab. */
@media (max-width: 899px) {
  .page {
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas: 'header' 'tabs' 'main';
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
  }

  .credits {
    display: none;
  }

  .play {
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: var(--space-2);
  }

  .board,
  .side,
  .over {
    grid-row: 3;
    min-height: 0;
  }

  /* max-content rows: the panels keep their full height, and the box scrolls. */
  .side {
    display: grid;
    grid-auto-rows: max-content;
    gap: var(--space-2);
    overflow-y: auto;
  }

  /* Only the section of the selected tab shows. */
  .view-quests .side,
  .view-shop .board,
  .view-shop .over,
  .view-log .board,
  .view-log .over,
  .view-log .side {
    display: none;
  }

  /* The Chronicle tab: the chronicle fills the space under the HUD. */
  .view-log .chronicle {
    grid-row: 2 / 4;
    overflow-y: auto;
  }
}
</style>
