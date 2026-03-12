<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { formatNoteDate, useNotes } from '@/composables/useNotes'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { notesPerPage, densityClass } = storeToRefs(uiStore)
const currentPage = ref(1)
const selectedGroupId = ref<number | null>(null)
const {
  notes,
  groups,
  isLoading,
  isError,
  error,
  isCreating,
  isUpdating,
  isDeleting,
  isImproving,
  isCreatingGroup,
  isGroupsLoading,
  createNote,
  updateNote,
  deleteNote,
  improveText,
  createGroup,
  notesCount,
} = useNotes(notesPerPage, currentPage, selectedGroupId)

const noteInput = ref('')
const editingId = ref<number | null>(null)
const editingText = ref('')
const selectedNoteIds = ref<number[]>([])
const groupNameInput = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(notesCount.value / notesPerPage.value)))
const selectedNotesCount = computed(() => selectedNoteIds.value.length)
const activeGroupName = computed(
  () => groups.value.find((group) => group.id === selectedGroupId.value)?.name ?? '',
)

watch(notesPerPage, () => {
  currentPage.value = 1
})
watch(selectedGroupId, () => {
  currentPage.value = 1
  selectedNoteIds.value = []
})

async function submitNote() {
  await createNote(noteInput.value)
  noteInput.value = ''
  currentPage.value = 1
}

async function improveCreateText() {
  noteInput.value = await improveText(noteInput.value)
}

function startEdit(id: number, text: string) {
  editingId.value = id
  editingText.value = text
}

function cancelEdit() {
  editingId.value = null
  editingText.value = ''
}

async function saveEdit(id: number) {
  await updateNote({ id, text: editingText.value })
  cancelEdit()
}

async function improveEditingText() {
  editingText.value = await improveText(editingText.value)
}

async function removeNote(id: number) {
  if (!window.confirm('Удалить заметку?')) {
    return
  }

  if (notes.value.length === 1 && currentPage.value > 1) {
    currentPage.value -= 1
  }
  selectedNoteIds.value = selectedNoteIds.value.filter((item) => item !== id)
  await deleteNote(id)
}

function goToPreviousPage() {
  currentPage.value = Math.max(1, currentPage.value - 1)
}

function goToNextPage() {
  currentPage.value = Math.min(totalPages.value, currentPage.value + 1)
}

function toggleNoteSelection(noteId: number) {
  selectedNoteIds.value = selectedNoteIds.value.includes(noteId)
    ? selectedNoteIds.value.filter((id) => id !== noteId)
    : [...selectedNoteIds.value, noteId]
}

function toggleAllVisibleNotes(checked: boolean) {
  if (checked) {
    selectedNoteIds.value = [...new Set([...selectedNoteIds.value, ...notes.value.map((note) => note.id)])]
    return
  }

  const visibleIds = new Set(notes.value.map((note) => note.id))
  selectedNoteIds.value = selectedNoteIds.value.filter((id) => !visibleIds.has(id))
}

function handleSelectAllChange(event: Event) {
  toggleAllVisibleNotes((event.target as HTMLInputElement).checked)
}

const isAllVisibleSelected = computed(() => {
  if (notes.value.length === 0) {
    return false
  }

  return notes.value.every((note) => selectedNoteIds.value.includes(note.id))
})

async function submitCreateGroup() {
  await createGroup({
    name: groupNameInput.value,
    noteIds: selectedNoteIds.value,
  })
  groupNameInput.value = ''
  selectedNoteIds.value = []
}

function clearSelection() {
  selectedNoteIds.value = []
}

function switchGroup(groupId: number | null) {
  selectedGroupId.value = groupId
}
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
    <article class="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold sm:text-base">Последние заметки</h2>
        <label class="flex items-center gap-2 text-xs text-slate-400">
          <span>Показывать</span>
          <input
            v-model.number="notesPerPage"
            type="number"
            min="4"
            max="20"
            class="w-14 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-slate-200 outline-none focus:border-cyan-300/50"
          />
        </label>
      </div>
      <div class="mb-3 space-y-2 rounded-xl border border-white/10 bg-slate-900/40 p-2.5">
        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <p>Выбрано заметок: {{ selectedNotesCount }}</p>
          <button
            type="button"
            class="cursor-pointer rounded-md border border-white/15 px-2 py-1 transition hover:border-white/30"
            :disabled="selectedNotesCount === 0"
            @click="clearSelection"
          >
            Снять выбор
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <input
            v-model="groupNameInput"
            type="text"
            placeholder="Название группы"
            class="min-w-44 flex-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-300/50"
          />
          <button
            type="button"
            :disabled="isCreatingGroup || selectedNotesCount === 0 || !groupNameInput.trim()"
            class="cursor-pointer rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            @click="submitCreateGroup"
          >
            {{ isCreatingGroup ? 'Создаю...' : 'Создать группу' }}
          </button>
        </div>
      </div>

      <form class="mb-3 space-y-2" @submit.prevent="submitNote">
        <textarea
          v-model="noteInput"
          rows="3"
          placeholder="Введите заметку..."
          class="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50"
          @keydown.ctrl.enter.prevent="submitNote"
        />
        <p class="text-[11px] text-slate-500">Подсказка: нажмите Ctrl+Enter, чтобы быстро сохранить заметку.</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            :disabled="isImproving || !noteInput.trim()"
            class="cursor-pointer rounded-xl border border-violet-300/30 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            @click="improveCreateText"
          >
            {{ isImproving ? 'Улучшаю...' : 'Улучшить текст ИИ' }}
          </button>
          <button
            type="submit"
            :disabled="isCreating || !noteInput.trim()"
            class="cursor-pointer rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isCreating ? 'Сохраняю...' : 'Сохранить заметку' }}
          </button>
        </div>
      </form>

      <div v-if="isLoading" class="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
        Загрузка...
      </div>
      <div
        v-else-if="isError"
        class="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200"
      >
        {{ error?.message ?? 'Не удалось загрузить заметки' }}
      </div>

      <ul v-else-if="notes.length > 0" class="space-y-2">
        <li
          v-for="note in notes"
          :key="note.id"
          :class="[
            'rounded-xl border border-white/10 bg-slate-900/60 px-3 transition',
            densityClass,
          ]"
        >
          <div v-if="editingId !== note.id" class="flex items-start justify-between gap-3">
            <label class="mt-0.5 shrink-0">
              <input
                :checked="selectedNoteIds.includes(note.id)"
                type="checkbox"
                class="size-3.5 cursor-pointer accent-cyan-400"
                @change="toggleNoteSelection(note.id)"
              />
            </label>
            <div class="min-w-0">
              <p class="max-h-10 overflow-hidden text-sm font-medium text-slate-100">
                {{ note.text }}
              </p>
              <p class="text-xs text-slate-400">{{ formatNoteDate(note.createdAt) }}</p>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                class="cursor-pointer rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
                @click="startEdit(note.id, note.text)"
              >
                Изм.
              </button>
              <button
                type="button"
                class="cursor-pointer rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-300 transition hover:border-rose-300/40 hover:text-rose-200"
                :disabled="isDeleting"
                @click="removeNote(note.id)"
              >
                Удал.
              </button>
            </div>
          </div>
          <form v-else class="space-y-2" @submit.prevent="saveEdit(note.id)">
            <textarea
              v-model="editingText"
              rows="3"
              class="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-300/50"
              @keydown.ctrl.enter.prevent="saveEdit(note.id)"
            />
            <p class="text-[11px] text-slate-500">Подсказка: Ctrl+Enter сохраняет изменения.</p>
            <div class="flex justify-end gap-1">
              <button
                type="button"
                :disabled="isImproving || !editingText.trim()"
                class="cursor-pointer rounded-lg border border-violet-300/30 bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                @click="improveEditingText"
              >
                {{ isImproving ? 'Улучшаю...' : 'ИИ улучшить' }}
              </button>
              <button
                type="button"
                class="cursor-pointer rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-300 transition hover:border-white/30"
                @click="cancelEdit"
              >
                Отмена
              </button>
              <button
                type="submit"
                :disabled="isUpdating || !editingText.trim()"
                class="cursor-pointer rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ isUpdating ? 'Сохр...' : 'Сохранить' }}
              </button>
            </div>
          </form>
        </li>
      </ul>
      <div v-else class="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
        Пока нет заметок. Добавьте первую запись выше.
      </div>

      <div v-if="notes.length > 0" class="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
        <input
          :checked="isAllVisibleSelected"
          type="checkbox"
          class="size-3.5 cursor-pointer accent-cyan-400"
          @change="handleSelectAllChange"
        />
        <span>Выбрать все на текущей странице</span>
      </div>

      <div class="mt-3 flex items-center justify-between text-xs text-slate-400">
        <p>Страница {{ currentPage }} из {{ totalPages }}</p>
        <div class="flex gap-1">
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-white/15 px-2 py-1 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage <= 1 || isLoading"
            @click="goToPreviousPage"
          >
            Назад
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-white/15 px-2 py-1 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage >= totalPages || isLoading"
            @click="goToNextPage"
          >
            Далее
          </button>
        </div>
      </div>
    </article>

    <aside class="space-y-4">
      <article class="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <h3 class="mb-2 text-sm font-semibold">Статистика</h3>
        <div class="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-3 text-center">
          <p class="text-2xl font-semibold text-cyan-200">{{ notesCount }}</p>
          <p class="text-xs text-cyan-100/80">
            {{ selectedGroupId ? `В группе "${activeGroupName}"` : 'Всего заметок в базе' }}
          </p>
        </div>
      </article>

      <article class="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300 sm:p-4">
        <h3 class="mb-2 text-sm font-semibold text-slate-100">Группы</h3>
        <div class="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            class="cursor-pointer rounded-lg border px-2 py-1 transition"
            :class="
              selectedGroupId === null
                ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200'
                : 'border-white/15 text-slate-300 hover:border-white/30'
            "
            @click="switchGroup(null)"
          >
            Все заметки
          </button>
          <button
            v-for="group in groups"
            :key="group.id"
            type="button"
            class="cursor-pointer rounded-lg border px-2 py-1 transition"
            :class="
              selectedGroupId === group.id
                ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200'
                : 'border-white/15 text-slate-300 hover:border-white/30'
            "
            @click="switchGroup(group.id)"
          >
            {{ group.name }} ({{ group.noteCount }})
          </button>
        </div>
        <p v-if="isGroupsLoading" class="text-[11px] text-slate-500">Загружаю группы...</p>
      </article>

      <article class="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300 sm:p-4">
        <h3 class="mb-2 text-sm font-semibold text-slate-100">Как это работает</h3>
        <ul class="space-y-1 text-slate-400">
          <li>Вводите текст в поле и нажимаете сохранить</li>
          <li>API сохраняет заметку в SQLite</li>
          <li>Сохраняется временная метка создания</li>
          <li>Можно выбирать заметки и объединять их в группы</li>
        </ul>
      </article>
    </aside>
  </section>
</template>
