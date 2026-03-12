import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { http } from '@/lib/http'
import { queryClient } from '@/lib/query-client'

type AuthUser = {
  id: number
  email: string
  createdAt: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isBootstrapping = ref(true)
  const isSubmitting = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function bootstrap() {
    isBootstrapping.value = true
    try {
      const { data } = await http.get<AuthUser>('/auth/me')
      user.value = data
    } catch {
      user.value = null
      queryClient.clear()
    } finally {
      isBootstrapping.value = false
    }
  }

  async function register(email: string, password: string) {
    isSubmitting.value = true
    try {
      const { data } = await http.post<AuthUser>('/auth/register', { email, password })
      user.value = data
      await queryClient.invalidateQueries()
    } finally {
      isSubmitting.value = false
    }
  }

  async function login(email: string, password: string) {
    isSubmitting.value = true
    try {
      const { data } = await http.post<AuthUser>('/auth/login', { email, password })
      user.value = data
      await queryClient.invalidateQueries()
    } finally {
      isSubmitting.value = false
    }
  }

  async function logout() {
    isSubmitting.value = true
    try {
      await http.post('/auth/logout')
      user.value = null
      queryClient.clear()
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    user,
    isBootstrapping,
    isSubmitting,
    isAuthenticated,
    bootstrap,
    register,
    login,
    logout,
  }
})
