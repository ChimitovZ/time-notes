import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'

export const useUiStore = defineStore('ui', () => {
  const compactMode = useStorage('ui:compact-mode', true)
  const notesPerPage = ref(8)

  const densityClass = computed(() => (compactMode.value ? 'py-2' : 'py-3.5'))

  function toggleCompactMode() {
    compactMode.value = !compactMode.value
  }

  return {
    compactMode,
    notesPerPage,
    densityClass,
    toggleCompactMode,
  }
})
