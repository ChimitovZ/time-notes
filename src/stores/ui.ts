import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

type ThemeMode = 'light' | 'graphite'
type TimeDisplayMode = 'relative' | 'absolute'

export const useUiStore = defineStore('ui', () => {
  const themeMode = useStorage<ThemeMode>('ui:theme-mode', 'light')
  const timeDisplayMode = useStorage<TimeDisplayMode>('ui:time-display-mode', 'relative')
  const notesPerPage = ref(8)

  const densityClass = computed(() => 'py-2')

  function toggleTheme() {
    themeMode.value = themeMode.value === 'light' ? 'graphite' : 'light'
  }

  function toggleTimeDisplay() {
    timeDisplayMode.value = timeDisplayMode.value === 'relative' ? 'absolute' : 'relative'
  }

  return {
    themeMode,
    timeDisplayMode,
    notesPerPage,
    densityClass,
    toggleTheme,
    toggleTimeDisplay,
  }
})
