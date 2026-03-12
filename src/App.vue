<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { themeMode } = storeToRefs(uiStore)

const shellClass = computed(() =>
  themeMode.value === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-zinc-900 text-zinc-100',
)

const headerClass = computed(() =>
  themeMode.value === 'light'
    ? 'border-slate-200 bg-white'
    : 'border-zinc-700/80 bg-zinc-800/60',
)
</script>

<template>
  <div :class="[shellClass, 'min-h-screen antialiased']">
    <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4 sm:px-6">
      <header :class="[headerClass, 'mb-4 flex items-center justify-between rounded-2xl border px-4 py-2.5']">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-400">Time Notes</p>
          <h1 class="text-sm font-semibold sm:text-base">Заметки</h1>
        </div>

        <button
          type="button"
          class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition"
          :class="
            themeMode === 'light'
              ? 'border-slate-300 text-slate-700 hover:border-cyan-400/50 hover:bg-cyan-50'
              : 'border-white/15 text-zinc-100 hover:border-zinc-400/60 hover:bg-zinc-700/40'
          "
          @click="uiStore.toggleTheme"
        >
          {{ themeMode === 'light' ? 'Тема: Light' : 'Тема: Graphite' }}
        </button>
      </header>

      <main class="flex-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
