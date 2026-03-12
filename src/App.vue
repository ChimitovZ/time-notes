<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { themeMode, timeDisplayMode } = storeToRefs(uiStore)

const shellClass = computed(() =>
  themeMode.value === 'light'
    ? 'bg-slate-50 text-slate-900'
    : themeMode.value === 'pastel'
      ? 'bg-[#fff6fb] text-[#5f4b70]'
      : 'bg-zinc-900 text-zinc-100',
)

const headerClass = computed(() =>
  themeMode.value === 'light'
    ? 'border-slate-200 bg-white'
    : themeMode.value === 'pastel'
      ? 'border-[#cdb4db]/70 bg-[#fff9fd]'
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

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition"
            :class="
              themeMode === 'light'
                ? 'border-slate-300 text-slate-700 hover:border-cyan-400/50 hover:bg-cyan-50'
                : themeMode === 'pastel'
                  ? 'border-[#cdb4db]/80 text-[#6b557c] hover:border-[#a2d2ff] hover:bg-[#f2f8ff]'
                  : 'border-white/15 text-zinc-100 hover:border-cyan-300/40 hover:bg-cyan-400/10'
            "
            @click="uiStore.toggleTheme"
          >
            {{
              themeMode === 'light'
                ? 'Тема: Light'
                : themeMode === 'pastel'
                  ? 'Тема: Pastel'
                  : 'Тема: Graphite'
            }}
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition"
            :class="
              themeMode === 'light'
                ? 'border-slate-300 text-slate-700 hover:border-cyan-400/50 hover:bg-cyan-50'
                : themeMode === 'pastel'
                  ? 'border-[#cdb4db]/80 text-[#6b557c] hover:border-[#a2d2ff] hover:bg-[#f2f8ff]'
                  : 'border-white/15 text-zinc-100 hover:border-cyan-300/40 hover:bg-cyan-400/10'
            "
            @click="uiStore.toggleTimeDisplay"
          >
            {{ timeDisplayMode === 'relative' ? 'Время: Относительное' : 'Время: Абсолютное' }}
          </button>
        </div>
      </header>

      <main class="flex-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
