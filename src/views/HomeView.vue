<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import {
  formatNoteDate,
  useNotes,
  type Note,
  type NoteComment,
  type NoteVersion,
} from '@/composables/useNotes'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { notesPerPage, densityClass, themeMode } = storeToRefs(uiStore)
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
  fetchNoteVersions,
  restoreNoteVersion,
  fetchNoteComments,
  createNoteComment,
  updateNoteComment,
  deleteNoteComment,
  isRestoringVersion,
  isCreatingComment,
  isUpdatingComment,
  isDeletingComment,
  notesCount,
} = useNotes(notesPerPage, currentPage, selectedGroupId)

const noteInput = ref('')
const editingId = ref<number | null>(null)
const editingText = ref('')
const selectedNoteIds = ref<number[]>([])
const groupNameInput = ref('')
const openedNote = ref<Note | null>(null)
const modalText = ref('')
const noteVersions = ref<NoteVersion[]>([])
const isVersionsLoading = ref(false)
const versionsError = ref('')
const noteComments = ref<NoteComment[]>([])
const isCommentsLoading = ref(false)
const commentsError = ref('')
const newCommentText = ref('')
const editingCommentId = ref<number | null>(null)
const editingCommentText = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(notesCount.value / notesPerPage.value)))
const selectedNotesCount = computed(() => selectedNoteIds.value.length)
const sortedNoteComments = computed(() =>
  [...noteComments.value].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (timeDiff !== 0) {
      return timeDiff
    }
    return b.id - a.id
  }),
)
const activeGroupName = computed(
  () => groups.value.find((group) => group.id === selectedGroupId.value)?.name ?? '',
)
const isLightTheme = computed(() => themeMode.value === 'light')

const surfaceClass = computed(() =>
  isLightTheme.value
    ? 'border-slate-200 bg-white text-slate-900'
    : 'border-white/10 bg-white/5 text-slate-100',
)
const subtleSurfaceClass = computed(() =>
  isLightTheme.value
    ? 'border-slate-200 bg-slate-50 text-slate-700'
    : 'border-white/10 bg-slate-900/40 text-slate-400',
)
const inputClass = computed(() =>
  isLightTheme.value
    ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-500/60'
    : 'border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/50',
)
const noteCardClass = computed(() =>
  isLightTheme.value ? 'border-slate-200 bg-slate-50/70' : 'border-white/10 bg-slate-900/60',
)
const mutedTextClass = computed(() => (isLightTheme.value ? 'text-slate-500' : 'text-slate-400'))
const mainTextClass = computed(() => (isLightTheme.value ? 'text-slate-900' : 'text-slate-100'))
const neutralButtonClass = computed(() =>
  isLightTheme.value
    ? 'border-slate-300 text-slate-700 hover:border-slate-400'
    : 'border-white/15 text-slate-300 hover:border-white/30',
)
const checkboxClass = computed(() =>
  isLightTheme.value
    ? 'size-3.5 cursor-pointer accent-cyan-500'
    : 'size-3.5 cursor-pointer accent-cyan-400',
)
const selectedGroupButtonClass = computed(() =>
  isLightTheme.value
    ? 'border-cyan-300/60 bg-cyan-50 text-cyan-700'
    : 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200',
)
const modalSurfaceClass = computed(() =>
  isLightTheme.value
    ? 'border-slate-200 bg-white text-slate-900'
    : 'border-zinc-700 bg-zinc-900 text-slate-100',
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

function handleNoteCardClick(note: Note, event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) {
    openNoteModal(note)
    return
  }

  if (target.closest('button, input, textarea, label, a')) {
    return
  }

  openNoteModal(note)
}

function toggleAllVisibleNotes(checked: boolean) {
  if (checked) {
    selectedNoteIds.value = [
      ...new Set([...selectedNoteIds.value, ...notes.value.map((note) => note.id)]),
    ]
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

function openNoteModal(note: Note) {
  openedNote.value = note
  modalText.value = note.text
  void loadNoteVersions(note.id)
  void loadNoteComments(note.id)
}

function closeNoteModal() {
  openedNote.value = null
  modalText.value = ''
  noteVersions.value = []
  versionsError.value = ''
  isVersionsLoading.value = false
  noteComments.value = []
  commentsError.value = ''
  isCommentsLoading.value = false
  newCommentText.value = ''
  editingCommentId.value = null
  editingCommentText.value = ''
}

async function improveModalText() {
  modalText.value = await improveText(modalText.value)
}

async function saveModalNote() {
  if (!openedNote.value) {
    return
  }

  const updated = await updateNote({ id: openedNote.value.id, text: modalText.value })
  openedNote.value = updated
  modalText.value = updated.text
  await loadNoteVersions(updated.id)
}

async function deleteModalNote() {
  if (!openedNote.value) {
    return
  }

  if (!window.confirm('Удалить заметку?')) {
    return
  }

  const deletingId = openedNote.value.id

  if (notes.value.length === 1 && currentPage.value > 1) {
    currentPage.value -= 1
  }
  selectedNoteIds.value = selectedNoteIds.value.filter((id) => id !== deletingId)
  await deleteNote(deletingId)
  closeNoteModal()
}

async function loadNoteVersions(noteId: number) {
  isVersionsLoading.value = true
  versionsError.value = ''

  try {
    noteVersions.value = await fetchNoteVersions(noteId)
  } catch (error) {
    versionsError.value = error instanceof Error ? error.message : 'Не удалось загрузить историю версий'
  } finally {
    isVersionsLoading.value = false
  }
}

async function loadNoteComments(noteId: number) {
  isCommentsLoading.value = true
  commentsError.value = ''

  try {
    noteComments.value = await fetchNoteComments(noteId)
  } catch (error) {
    commentsError.value = error instanceof Error ? error.message : 'Не удалось загрузить комментарии'
  } finally {
    isCommentsLoading.value = false
  }
}

async function restoreFromHistory(version: number) {
  if (!openedNote.value) {
    return
  }

  if (!window.confirm(`Восстановить версию ${version}?`)) {
    return
  }

  const restored = await restoreNoteVersion({
    noteId: openedNote.value.id,
    version,
  })

  openedNote.value = restored
  modalText.value = restored.text
  await loadNoteVersions(restored.id)
}

function getVersionPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 90 ? `${normalized.slice(0, 90).trimEnd()}...` : normalized
}

function startEditComment(comment: NoteComment) {
  editingCommentId.value = comment.id
  editingCommentText.value = comment.text
}

function cancelEditComment() {
  editingCommentId.value = null
  editingCommentText.value = ''
}

async function submitComment() {
  if (!openedNote.value) {
    return
  }

  await createNoteComment({ noteId: openedNote.value.id, text: newCommentText.value })
  newCommentText.value = ''
  await loadNoteComments(openedNote.value.id)
}

async function saveCommentEdit(commentId: number) {
  if (!openedNote.value) {
    return
  }

  await updateNoteComment({ commentId, text: editingCommentText.value })
  cancelEditComment()
  await loadNoteComments(openedNote.value.id)
}

async function removeComment(commentId: number) {
  if (!openedNote.value) {
    return
  }

  if (!window.confirm('Удалить комментарий?')) {
    return
  }

  await deleteNoteComment(commentId)
  if (editingCommentId.value === commentId) {
    cancelEditComment()
  }
  await loadNoteComments(openedNote.value.id)
}
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
    <article :class="[surfaceClass, 'rounded-2xl border p-3 sm:p-4']">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold sm:text-base">Последние заметки</h2>
        <p :class="[mutedTextClass, 'text-[11px]']">Выбрано: {{ selectedNotesCount }}</p>
        <label :class="[mutedTextClass, 'flex items-center gap-2 text-xs']">
          <span>Показывать</span>
          <input
            v-model.number="notesPerPage"
            type="number"
            min="4"
            max="20"
            :class="[inputClass, 'w-14 rounded-lg border px-2 py-1 outline-none']"
          />
        </label>
      </div>

      <form class="mb-3 space-y-2" @submit.prevent="submitNote">
        <textarea
          v-model="noteInput"
          rows="3"
          placeholder="Введите заметку..."
          :class="[
            inputClass,
            'w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition',
          ]"
          @keydown.ctrl.enter.prevent="submitNote"
        />
        <p :class="[mutedTextClass, 'text-[11px]']">
          Подсказка: нажмите Ctrl+Enter, чтобы быстро сохранить заметку.
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            :disabled="isImproving || !noteInput.trim()"
            :class="
              isLightTheme
                ? 'cursor-pointer rounded-xl border border-violet-300/70 bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50'
                : 'cursor-pointer rounded-xl border border-violet-300/30 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50'
            "
            @click="improveCreateText"
          >
            {{ isImproving ? 'Улучшаю...' : 'Улучшить текст ИИ' }}
          </button>
          <button
            type="submit"
            :disabled="isCreating || !noteInput.trim()"
            :class="
              isLightTheme
                ? 'cursor-pointer rounded-xl border border-cyan-300/70 bg-cyan-100 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50'
                : 'cursor-pointer rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50'
            "
          >
            {{ isCreating ? 'Сохраняю...' : 'Сохранить заметку' }}
          </button>
        </div>
      </form>

      <div v-if="isLoading" :class="[subtleSurfaceClass, 'rounded-xl border px-3 py-2 text-xs']">
        Загрузка...
      </div>
      <div
        v-else-if="isError"
        :class="
          isLightTheme
            ? 'rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-xs text-rose-700'
            : 'rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200'
        "
      >
        {{ error?.message ?? 'Не удалось загрузить заметки' }}
      </div>

      <ul v-else-if="notes.length > 0" class="space-y-2">
        <li
          v-for="note in notes"
          :key="note.id"
          :class="['rounded-xl border px-3 transition cursor-pointer', noteCardClass, densityClass]"
        >
          <div
            v-if="editingId !== note.id"
            class="flex items-start justify-between gap-3"
            @click="handleNoteCardClick(note, $event)"
          >
            <label class="mt-0.5 shrink-0">
              <input
                :checked="selectedNoteIds.includes(note.id)"
                type="checkbox"
                :class="checkboxClass"
                @click.stop
                @change="toggleNoteSelection(note.id)"
              />
            </label>
            <div class="min-w-0 flex-1 text-left">
              <p :class="[mainTextClass, 'max-h-10 overflow-hidden text-sm font-medium']">
                {{ note.text }}
              </p>
              <p :class="[mutedTextClass, 'text-xs']">{{ formatNoteDate(note.createdAt) }}</p>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                :class="[
                  neutralButtonClass,
                  'cursor-pointer rounded-lg border px-2 py-1 text-[11px] transition',
                ]"
                @click.stop="openNoteModal(note)"
              >
                Открыть
              </button>
            </div>
          </div>
          <form v-else class="space-y-2" @submit.prevent="saveEdit(note.id)">
            <textarea
              v-model="editingText"
              rows="3"
              :class="[
                inputClass,
                'w-full resize-none rounded-lg border px-2 py-1.5 text-sm outline-none',
              ]"
              @keydown.ctrl.enter.prevent="saveEdit(note.id)"
            />
            <p :class="[mutedTextClass, 'text-[11px]']">
              Подсказка: Ctrl+Enter сохраняет изменения.
            </p>
            <div class="flex justify-end gap-1">
              <button
                type="button"
                :disabled="isImproving || !editingText.trim()"
                :class="
                  isLightTheme
                    ? 'cursor-pointer rounded-lg border border-violet-300/70 bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50'
                    : 'cursor-pointer rounded-lg border border-violet-300/30 bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50'
                "
                @click="improveEditingText"
              >
                {{ isImproving ? 'Улучшаю...' : 'ИИ улучшить' }}
              </button>
              <button
                type="button"
                :class="[
                  neutralButtonClass,
                  'cursor-pointer rounded-lg border px-2 py-1 text-[11px] transition',
                ]"
                @click="cancelEdit"
              >
                Отмена
              </button>
              <button
                type="submit"
                :disabled="isUpdating || !editingText.trim()"
                :class="
                  isLightTheme
                    ? 'cursor-pointer rounded-lg border border-cyan-300/70 bg-cyan-100 px-2 py-1 text-[11px] font-semibold text-cyan-800 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50'
                    : 'cursor-pointer rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50'
                "
              >
                {{ isUpdating ? 'Сохр...' : 'Сохранить' }}
              </button>
            </div>
          </form>
        </li>
      </ul>
      <div v-else :class="[subtleSurfaceClass, 'rounded-xl border px-3 py-2 text-xs']">
        Пока нет заметок. Добавьте первую запись выше.
      </div>

      <div
        v-if="notes.length > 0"
        :class="[mutedTextClass, 'mt-2 flex items-center gap-2 text-[11px]']"
      >
        <input
          :checked="isAllVisibleSelected"
          type="checkbox"
          :class="checkboxClass"
          @change="handleSelectAllChange"
        />
        <span>Выбрать все на текущей странице</span>
      </div>

      <div :class="[mutedTextClass, 'mt-3 flex items-center justify-between text-xs']">
        <p>Страница {{ currentPage }} из {{ totalPages }}</p>
        <div class="flex gap-1">
          <button
            type="button"
            :class="[
              neutralButtonClass,
              'cursor-pointer rounded-lg border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50',
            ]"
            :disabled="currentPage <= 1 || isLoading"
            @click="goToPreviousPage"
          >
            Назад
          </button>
          <button
            type="button"
            :class="[
              neutralButtonClass,
              'cursor-pointer rounded-lg border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50',
            ]"
            :disabled="currentPage >= totalPages || isLoading"
            @click="goToNextPage"
          >
            Далее
          </button>
        </div>
      </div>
    </article>

    <aside class="space-y-4">
      <article :class="[surfaceClass, 'rounded-2xl border p-3 sm:p-4']">
        <h3 class="mb-2 text-sm font-semibold">Статистика</h3>
        <div
          :class="
            isLightTheme
              ? 'rounded-xl border border-cyan-300/50 bg-cyan-50 px-3 py-3 text-left'
              : 'rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-3 text-left'
          "
        >
          <p
            :class="
              isLightTheme
                ? 'text-2xl font-semibold text-cyan-700'
                : 'text-2xl font-semibold text-cyan-200'
            "
          >
            {{ notesCount }}
          </p>
          <p :class="isLightTheme ? 'text-xs text-cyan-700/80' : 'text-xs text-cyan-100/80'">
            {{ selectedGroupId ? `В группе "${activeGroupName}"` : 'Всего заметок в базе' }}
          </p>
        </div>
      </article>

      <article :class="[surfaceClass, 'rounded-2xl border p-3 text-xs sm:p-4']">
        <h3 :class="[mainTextClass, 'mb-2 text-sm font-semibold']">Группы</h3>
        <div :class="[subtleSurfaceClass, 'mb-2 space-y-2 rounded-xl border p-2']">
          <div :class="[mutedTextClass, 'flex items-center justify-between text-[11px]']">
            <p>Выбрано заметок: {{ selectedNotesCount }}</p>
            <button
              type="button"
              :class="[neutralButtonClass, 'cursor-pointer rounded-md border px-2 py-1 transition']"
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
              :class="[
                inputClass,
                'min-w-44 flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none',
              ]"
            />
            <button
              type="button"
              :disabled="isCreatingGroup || selectedNotesCount === 0 || !groupNameInput.trim()"
              :class="
                isLightTheme
                  ? 'cursor-pointer rounded-lg border border-amber-300/70 bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'cursor-pointer rounded-lg border border-amber-300/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50'
              "
              @click="submitCreateGroup"
            >
              {{ isCreatingGroup ? 'Создаю...' : 'Создать группу' }}
            </button>
          </div>
        </div>
        <div class="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            class="cursor-pointer rounded-lg border px-2 py-1 transition"
            :class="
              selectedGroupId === null
                ? selectedGroupButtonClass
                : isLightTheme
                  ? 'border-slate-300 text-slate-700 hover:border-slate-400'
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
                ? selectedGroupButtonClass
                : isLightTheme
                  ? 'border-slate-300 text-slate-700 hover:border-slate-400'
                  : 'border-white/15 text-slate-300 hover:border-white/30'
            "
            @click="switchGroup(group.id)"
          >
            {{ group.name }} ({{ group.noteCount }})
          </button>
        </div>
        <p v-if="isGroupsLoading" :class="[mutedTextClass, 'text-[11px]']">Загружаю группы...</p>
      </article>

      <article :class="[surfaceClass, 'rounded-2xl border p-3 text-xs sm:p-4']">
        <h3 :class="[mainTextClass, 'mb-2 text-sm font-semibold']">Как это работает</h3>
        <ul :class="[mutedTextClass, 'space-y-1']">
          <li>Вводите текст в поле и нажимаете сохранить</li>
          <li>API сохраняет заметку в SQLite</li>
          <li>Сохраняется временная метка создания</li>
          <li>Можно выбирать заметки и объединять их в группы</li>
        </ul>
      </article>
    </aside>
  </section>

  <div
    v-if="openedNote"
    :class="
      isLightTheme
        ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
        : 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4'
    "
    @click.self="closeNoteModal"
  >
    <div :class="[modalSurfaceClass, 'w-full max-w-2xl rounded-2xl border p-4 shadow-xl']">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 :class="[mainTextClass, 'text-base font-semibold']">Полная заметка</h3>
          <p :class="[mutedTextClass, 'text-xs']">{{ formatNoteDate(openedNote.createdAt) }}</p>
          <p :class="[mutedTextClass, 'text-xs']">Текущая версия: v{{ openedNote.version }}</p>
        </div>
        <button
          type="button"
          :class="[
            neutralButtonClass,
            'cursor-pointer rounded-lg border px-2 py-1 text-[11px] transition',
          ]"
          @click="closeNoteModal"
        >
          Закрыть
        </button>
      </div>

      <textarea
        v-model="modalText"
        rows="10"
        :class="[
          inputClass,
          'mb-2 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none',
        ]"
        @keydown.ctrl.enter.prevent="saveModalNote"
      />
      <p :class="[mutedTextClass, 'mb-2 text-[11px]']">
        Подсказка: Ctrl+Enter сохраняет изменения в заметке.
      </p>

      <div :class="[subtleSurfaceClass, 'mb-3 rounded-xl border p-2.5']">
        <p :class="[mainTextClass, 'mb-2 text-xs font-semibold']">История версий</p>
        <p v-if="isVersionsLoading" :class="[mutedTextClass, 'text-[11px]']">Загрузка...</p>
        <p v-else-if="versionsError" class="text-[11px] text-rose-500">{{ versionsError }}</p>
        <ul v-else-if="noteVersions.length > 0" class="max-h-32 space-y-1 overflow-y-auto pr-1">
          <li
            v-for="versionItem in noteVersions"
            :key="versionItem.version"
            class="flex items-center justify-between gap-2"
          >
            <div class="min-w-0">
              <p :class="[mainTextClass, 'truncate text-[11px] font-medium']">{{ getVersionPreview(versionItem.text) }}</p>
              <p :class="[mutedTextClass, 'truncate text-[10px]']">
                v{{ versionItem.version }} • {{ formatNoteDate(versionItem.createdAt) }}
              </p>
            </div>
            <button
              type="button"
              :disabled="isRestoringVersion || versionItem.version === openedNote.version"
              :class="[neutralButtonClass, 'cursor-pointer rounded-md border px-2 py-1 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-50']"
              @click="restoreFromHistory(versionItem.version)"
            >
              Восстановить
            </button>
          </li>
        </ul>
        <p v-else :class="[mutedTextClass, 'text-[11px]']">История пока пустая.</p>
      </div>

      <div :class="[subtleSurfaceClass, 'mb-3 rounded-xl border p-2.5']">
        <p :class="[mainTextClass, 'mb-2 text-xs font-semibold']">Комментарии</p>
        <form class="mb-2 space-y-1.5" @submit.prevent="submitComment">
          <textarea
            v-model="newCommentText"
            rows="2"
            placeholder="Добавьте комментарий..."
            :class="[inputClass, 'w-full resize-y rounded-lg border px-2 py-1.5 text-xs outline-none']"
            @keydown.ctrl.enter.prevent="submitComment"
          />
          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="isCreatingComment || !newCommentText.trim()"
              :class="
                isLightTheme
                  ? 'cursor-pointer rounded-lg border border-cyan-300/70 bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'cursor-pointer rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50'
              "
            >
              {{ isCreatingComment ? 'Добавляю...' : 'Добавить' }}
            </button>
          </div>
        </form>
        <p v-if="isCommentsLoading" :class="[mutedTextClass, 'text-[11px]']">Загрузка комментариев...</p>
        <p v-else-if="commentsError" class="text-[11px] text-rose-500">{{ commentsError }}</p>
        <ul v-else-if="sortedNoteComments.length > 0" class="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          <li
            v-for="comment in sortedNoteComments"
            :key="comment.id"
            :class="[inputClass, 'rounded-lg border px-2 py-1.5']"
          >
            <div v-if="editingCommentId !== comment.id" class="space-y-1">
              <p :class="[mainTextClass, 'text-[11px] leading-relaxed']">{{ comment.text }}</p>
              <div class="flex items-center justify-between gap-2">
                <p :class="[mutedTextClass, 'text-[10px]']">{{ formatNoteDate(comment.createdAt) }}</p>
                <div class="flex gap-1">
                  <button
                    type="button"
                    :class="[neutralButtonClass, 'cursor-pointer rounded-md border px-2 py-0.5 text-[10px] transition']"
                    @click="startEditComment(comment)"
                  >
                    Изм.
                  </button>
                  <button
                    type="button"
                    :disabled="isDeletingComment"
                    :class="
                      isLightTheme
                        ? 'cursor-pointer rounded-md border border-rose-300/70 bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50'
                        : 'cursor-pointer rounded-md border border-rose-300/30 bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50'
                    "
                    @click="removeComment(comment.id)"
                  >
                    Удал.
                  </button>
                </div>
              </div>
            </div>
            <form v-else class="space-y-1.5" @submit.prevent="saveCommentEdit(comment.id)">
              <textarea
                v-model="editingCommentText"
                rows="2"
                :class="[inputClass, 'w-full resize-y rounded-md border px-2 py-1 text-[11px] outline-none']"
              />
              <div class="flex justify-end gap-1">
                <button
                  type="button"
                  :class="[neutralButtonClass, 'cursor-pointer rounded-md border px-2 py-0.5 text-[10px] transition']"
                  @click="cancelEditComment"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  :disabled="isUpdatingComment || !editingCommentText.trim()"
                  :class="
                    isLightTheme
                      ? 'cursor-pointer rounded-md border border-cyan-300/70 bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-800 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50'
                      : 'cursor-pointer rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50'
                  "
                >
                  {{ isUpdatingComment ? 'Сохр...' : 'Сохранить' }}
                </button>
              </div>
            </form>
          </li>
        </ul>
        <p v-else :class="[mutedTextClass, 'text-[11px]']">Комментариев пока нет.</p>
      </div>

      <div class="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          :disabled="isDeleting"
          :class="
            isLightTheme
              ? 'cursor-pointer rounded-xl border border-rose-300/70 bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50'
              : 'cursor-pointer rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50'
          "
          @click="deleteModalNote"
        >
          {{ isDeleting ? 'Удаляю...' : 'Удалить' }}
        </button>
        <button
          type="button"
          :disabled="isImproving || !modalText.trim()"
          :class="
            isLightTheme
              ? 'cursor-pointer rounded-xl border border-violet-300/70 bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50'
              : 'cursor-pointer rounded-xl border border-violet-300/30 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50'
          "
          @click="improveModalText"
        >
          {{ isImproving ? 'Улучшаю...' : 'Улучшить ИИ' }}
        </button>
        <button
          type="button"
          :disabled="isUpdating || !modalText.trim()"
          :class="
            isLightTheme
              ? 'cursor-pointer rounded-xl border border-cyan-300/70 bg-cyan-100 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50'
              : 'cursor-pointer rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50'
          "
          @click="saveModalNote"
        >
          {{ isUpdating ? 'Сохр...' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </div>
</template>
