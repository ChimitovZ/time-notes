<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { compactMode } = storeToRefs(uiStore)
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 antialiased">
    <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4 sm:px-6">
      <header class="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Time Notes</p>
          <h1 class="text-sm font-semibold sm:text-base">Vue 3 Starter</h1>
        </div>

        <button
          type="button"
          class="cursor-pointer rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
          @click="uiStore.toggleCompactMode"
        >
          {{ compactMode ? 'Компактный режим' : 'Стандартная плотность' }}
        </button>
      </header>

      <main class="flex-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
