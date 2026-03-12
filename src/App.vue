<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import axios from 'axios'

import { useAuthStore } from '@/stores/auth'
import { useUiStore, type ThemeMode } from '@/stores/ui'

const uiStore = useUiStore()
const authStore = useAuthStore()
const { themeMode, timeDisplayMode } = storeToRefs(uiStore)
const { isAuthenticated, isBootstrapping, isSubmitting, user } = storeToRefs(authStore)

const authMode = ref<'login' | 'register'>('login')
const authEmail = ref('')
const authPassword = ref('')
const authError = ref('')
const isThemePickerOpen = ref(false)
const themePickerRef = ref<HTMLElement | null>(null)

const actionButtonClass = computed(() => 'theme-btn-neutral')
const shellClass = computed(() => 'theme-shell')
const headerClass = computed(() => 'theme-header')
const authCardClass = computed(() => 'theme-surface')
const authInputClass = computed(() => 'theme-input')

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
  () => `Тема: ${themeOptions.find((option) => option.id === themeMode.value)?.title ?? 'Light'}`,
)

onMounted(() => {
  void authStore.bootstrap()

  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('mousedown', handleGlobalMouseDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousedown', handleGlobalMouseDown)
})

async function submitAuth() {
  authError.value = ''
  const email = authEmail.value.trim()
  const password = authPassword.value

  if (!email || password.length < 8) {
    authError.value = 'Введите корректный email и пароль (минимум 8 символов).'
    return
  }

  try {
    if (authMode.value === 'register') {
      await authStore.register(email, password)
    } else {
      await authStore.login(email, password)
    }
    authPassword.value = ''
  } catch (error) {
    if (axios.isAxiosError(error)) {
      authError.value = String(error.response?.data?.message ?? 'Ошибка авторизации')
      return
    }
    authError.value = 'Ошибка авторизации'
  }
}

async function logout() {
  await authStore.logout()
}

function selectTheme(theme: ThemeMode) {
  uiStore.setTheme(theme)
  isThemePickerOpen.value = false
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isThemePickerOpen.value = false
  }
}

function handleGlobalMouseDown(event: MouseEvent) {
  if (!isThemePickerOpen.value) {
    return
  }

  const pickerElement = themePickerRef.value
  if (!pickerElement) {
    return
  }

  if (!pickerElement.contains(event.target as Node)) {
    isThemePickerOpen.value = false
  }
}
</script>

<template>
  <div :data-theme="themeMode" :class="[shellClass, 'min-h-screen antialiased']">
    <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4 sm:px-6">
      <header :class="[headerClass, 'mb-4 flex items-center justify-between rounded-2xl border px-4 py-2.5']">
        <div>
          <p class="theme-text-muted text-xs uppercase tracking-[0.18em]">Time Notes</p>
          <h1 class="text-sm font-semibold sm:text-base">Заметки</h1>
        </div>

        <div class="flex items-center gap-1.5">
          <div ref="themePickerRef" class="relative">
            <button
              type="button"
              class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition"
              :class="actionButtonClass"
              @click="isThemePickerOpen = !isThemePickerOpen"
            >
              {{ themeLabel }}
            </button>

            <div
              v-if="isThemePickerOpen"
              class="theme-surface absolute right-0 z-20 mt-2 w-64 rounded-xl border p-2 shadow-xl"
            >
              <p class="theme-text-muted mb-2 px-1 text-[11px]">Выбор темы</p>
              <div class="space-y-1.5">
                <button
                  v-for="option in themeOptions"
                  :key="option.id"
                  type="button"
                  class="w-full cursor-pointer rounded-lg border p-2 text-left transition"
                  :class="
                    option.id === themeMode
                      ? 'ring-2 ring-cyan-400/70'
                      : 'hover:opacity-95'
                  "
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
                      {{ option.id === themeMode ? 'Текущая' : 'Выбрать' }}
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
          <button
            type="button"
            class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition"
            :class="actionButtonClass"
            @click="uiStore.toggleTimeDisplay"
          >
            {{ timeDisplayMode === 'relative' ? 'Время: Относительное' : 'Время: Абсолютное' }}
          </button>
          <button
            v-if="isAuthenticated"
            type="button"
            class="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition"
            :class="actionButtonClass"
            :disabled="isSubmitting"
            @click="logout"
          >
            Выйти ({{ user?.email }})
          </button>
        </div>
      </header>

      <main class="flex-1">
        <div v-if="isBootstrapping" class="theme-text-muted px-1 py-5 text-sm">Проверка сессии...</div>

        <RouterView v-else-if="isAuthenticated" />

        <section
          v-else
          :class="[authCardClass, 'mx-auto mt-8 w-full max-w-sm rounded-2xl border p-4 sm:p-5']"
        >
          <h2 class="mb-1 text-sm font-semibold">
            {{ authMode === 'register' ? 'Создать аккаунт' : 'Вход в аккаунт' }}
          </h2>
          <p class="theme-text-muted mb-3 text-xs">После входа вы увидите только свои заметки.</p>

          <form class="space-y-2.5" @submit.prevent="submitAuth">
            <input
              v-model.trim="authEmail"
              type="email"
              autocomplete="username"
              placeholder="Email"
              class="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-cyan-500/25"
              :class="authInputClass"
            />
            <input
              v-model="authPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Пароль (мин. 8 символов)"
              class="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-cyan-500/25"
              :class="authInputClass"
            />
            <p v-if="authError" class="text-xs text-rose-500">{{ authError }}</p>

            <button
              type="submit"
              class="w-full cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition"
              :class="actionButtonClass"
              :disabled="isSubmitting"
            >
              {{
                isSubmitting ? 'Подождите...' : authMode === 'register' ? 'Зарегистрироваться' : 'Войти'
              }}
            </button>
          </form>

          <button
            type="button"
            class="mt-2 w-full cursor-pointer rounded-xl border px-3 py-2 text-xs transition"
            :class="actionButtonClass"
            :disabled="isSubmitting"
            @click="authMode = authMode === 'register' ? 'login' : 'register'"
          >
            {{
              authMode === 'register'
                ? 'Уже есть аккаунт? Войти'
                : 'Нет аккаунта? Зарегистрироваться'
            }}
          </button>
        </section>
      </main>
    </div>
  </div>
</template>
