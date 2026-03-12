<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import axios from 'axios'

import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const authStore = useAuthStore()
const { themeMode, timeDisplayMode } = storeToRefs(uiStore)
const { isAuthenticated, isBootstrapping, isSubmitting, user } = storeToRefs(authStore)

const authMode = ref<'login' | 'register'>('login')
const authEmail = ref('')
const authPassword = ref('')
const authError = ref('')

const actionButtonClass = computed(() =>
  themeMode.value === 'light'
    ? 'border-slate-300 text-slate-700 hover:border-cyan-400/50 hover:bg-cyan-50'
    : themeMode.value === 'pastel'
      ? 'border-[#cdb4db]/80 text-[#6b557c] hover:border-[#a2d2ff] hover:bg-[#f2f8ff]'
      : 'border-white/15 text-zinc-100 hover:border-cyan-300/40 hover:bg-cyan-400/10',
)

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

const authCardClass = computed(() =>
  themeMode.value === 'light'
    ? 'border-slate-200 bg-white'
    : themeMode.value === 'pastel'
      ? 'border-[#cdb4db]/70 bg-[#fff9fd]'
      : 'border-zinc-700/80 bg-zinc-800/75',
)

const authInputClass = computed(() =>
  themeMode.value === 'light'
    ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
    : themeMode.value === 'pastel'
      ? 'border-[#cdb4db]/80 bg-[#fffdfd] text-[#5f4b70] placeholder:text-[#9a86ad]'
      : 'border-zinc-600 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500',
)

onMounted(() => {
  void authStore.bootstrap()
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
            :class="actionButtonClass"
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
        <div v-if="isBootstrapping" class="px-1 py-5 text-sm text-slate-400">Проверка сессии...</div>

        <RouterView v-else-if="isAuthenticated" />

        <section
          v-else
          :class="[authCardClass, 'mx-auto mt-8 w-full max-w-sm rounded-2xl border p-4 sm:p-5']"
        >
          <h2 class="mb-1 text-sm font-semibold">
            {{ authMode === 'register' ? 'Создать аккаунт' : 'Вход в аккаунт' }}
          </h2>
          <p class="mb-3 text-xs text-slate-400">После входа вы увидите только свои заметки.</p>

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
