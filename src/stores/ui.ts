import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

type ThemeMode = 'light' | 'graphite' | 'pastel' | 'crimson'
type TimeDisplayMode = 'relative' | 'absolute'

export const useUiStore = defineStore('ui', () => {
  const themeMode = useStorage<ThemeMode>('ui:theme-mode', 'light')
  const timeDisplayMode = useStorage<TimeDisplayMode>('ui:time-display-mode', 'relative')
  const notesPerPage = ref(8)

  const densityClass = computed(() => 'py-2')

  function toggleTheme() {
    const themeOrder: ThemeMode[] = ['light', 'graphite', 'pastel', 'crimson']
    const currentIndex = themeOrder.indexOf(themeMode.value)
    themeMode.value = themeOrder[(currentIndex + 1) % themeOrder.length]
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
