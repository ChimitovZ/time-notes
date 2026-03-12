import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

type ThemeMode = 'light' | 'graphite'

export const useUiStore = defineStore('ui', () => {
  const themeMode = useStorage<ThemeMode>('ui:theme-mode', 'light')
  const notesPerPage = ref(8)

  const densityClass = computed(() => 'py-2')

  function toggleTheme() {
    themeMode.value = themeMode.value === 'light' ? 'graphite' : 'light'
  }

  return {
    themeMode,
    notesPerPage,
    densityClass,
    toggleTheme,
  }
})
