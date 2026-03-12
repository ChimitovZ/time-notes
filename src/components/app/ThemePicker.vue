<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { ThemeMode } from '@/stores/ui'

const props = defineProps<{
  value: ThemeMode
  buttonClass: string
}>()

const emit = defineEmits<{
  (event: 'change', theme: ThemeMode): void
}>()

const isOpen = ref(false)
const pickerRef = ref<HTMLElement | null>(null)

const themeOptions: Array<{
  id: ThemeMode
  title: string
  sampleText: string
  preview: {
    surface: string
    border: string
    title: string
    muted: string
    cardBg: string
    cardBorder: string
  }
}> = [
  {
    id: 'light',
    title: 'Light',
    sampleText: 'Светлая заметка',
    preview: {
      surface: '#ffffff',
      border: '#e2e8f0',
      title: '#0f172a',
      muted: '#64748b',
      cardBg: '#f8fafc',
      cardBorder: '#e2e8f0',
    },
  },
  {
    id: 'graphite',
    title: 'Graphite',
    sampleText: 'Темная заметка',
    preview: {
      surface: '#27272a',
      border: '#52525b',
      title: '#f1f5f9',
      muted: '#94a3b8',
      cardBg: '#0f172a',
      cardBorder: '#334155',
    },
  },
  {
    id: 'pastel',
    title: 'Pastel',
    sampleText: 'Мягкая заметка',
    preview: {
      surface: '#fff9fd',
      border: '#cdb4db',
      title: '#5f4b70',
      muted: '#8e739f',
      cardBg: '#fff1f8',
      cardBorder: '#ffc8dd',
    },
  },
  {
    id: 'crimson',
    title: 'Crimson',
    sampleText: 'Акцентная заметка',
    preview: {
      surface: '#6e1423',
      border: '#a11d33',
      title: '#fff1f2',
      muted: '#fecdd3',
      cardBg: '#85182a',
      cardBorder: '#c71f37',
    },
  },
]

const themeLabel = computed(
  () => `Тема: ${themeOptions.find((option) => option.id === props.value)?.title ?? 'Light'}`,
)

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function selectTheme(theme: ThemeMode) {
  emit('change', theme)
  isOpen.value = false
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

function handleGlobalMouseDown(event: MouseEvent) {
  if (!isOpen.value) return

  const pickerElement = pickerRef.value
  if (!pickerElement) return

  if (!pickerElement.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('mousedown', handleGlobalMouseDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousedown', handleGlobalMouseDown)
})
</script>

<template>
  <div ref="pickerRef" class="relative">
    <button
      type="button"
      class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition"
      :class="buttonClass"
      @click="toggleOpen"
    >
      {{ themeLabel }}
    </button>

    <div
      v-if="isOpen"
      class="theme-surface absolute right-0 z-20 mt-2 w-64 rounded-xl border p-2 shadow-xl"
    >
      <p class="theme-text-muted mb-2 px-1 text-[11px]">Выбор темы</p>
      <div class="space-y-1.5">
        <button
          v-for="option in themeOptions"
          :key="option.id"
          type="button"
          class="w-full cursor-pointer rounded-lg border p-2 text-left transition"
          :class="option.id === value ? 'ring-2 ring-cyan-400/70' : 'hover:opacity-95'"
          :style="{
            backgroundColor: option.preview.surface,
            borderColor: option.preview.border,
          }"
          @click="selectTheme(option.id)"
        >
          <div class="mb-1 flex items-center justify-between">
            <span class="text-xs font-semibold" :style="{ color: option.preview.title }">
              {{ option.title }}
            </span>
            <span class="text-[10px]" :style="{ color: option.preview.muted }">
              {{ option.id === value ? 'Текущая' : 'Выбрать' }}
            </span>
          </div>
          <div
            class="rounded-md border px-2 py-1.5"
            :style="{
              backgroundColor: option.preview.cardBg,
              borderColor: option.preview.cardBorder,
            }"
          >
            <p class="truncate text-[11px] font-medium" :style="{ color: option.preview.title }">
              {{ option.sampleText }}
            </p>
            <p class="text-[10px]" :style="{ color: option.preview.muted }">
              12:45 • Предпросмотр карточки
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
