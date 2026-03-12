<script setup lang="ts">
import type { Note } from '@/composables/useNotes'

const props = defineProps<{
  notesPerPage: number
  noteInput: string
  isImproving: boolean
  isCreating: boolean
  isLoading: boolean
  isError: boolean
  errorMessage: string
  notes: Note[]
  editingId: number | null
  editingText: string
  selectedNoteIds: number[]
  densityClass: string
  inputClass: string
  subtleSurfaceClass: string
  noteCardClass: string
  mutedTextClass: string
  mainTextClass: string
  neutralButtonClass: string
  checkboxClass: string
  primaryButtonClass: string
  aiButtonClass: string
  isAllVisibleSelected: boolean
  showNoteDiffs: boolean
  currentPage: number
  totalPages: number
  isUpdating: boolean
  onNotesPerPageChange: (value: number) => void
  onNoteInputChange: (value: string) => void
  onSubmitNote: () => void
  onImproveCreateText: () => void
  onToggleNoteSelection: (noteId: number) => void
  onOpenNote: (note: Note) => void
  onEditingTextChange: (value: string) => void
  onSaveEdit: (id: number) => void
  onCancelEdit: () => void
  onImproveEditingText: () => void
  onToggleAllVisibleNotes: (checked: boolean) => void
  onToggleNoteDiffs: () => void
  onPrevPage: () => void
  onNextPage: () => void
  formatUiDate: (value: string) => string
  formatAbsoluteDate: (value: string) => string
  getNoteGapLabel: (index: number) => string
}>()

function handleNoteCardClick(note: Note, event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) {
    props.onOpenNote(note)
    return
  }

  if (target.closest('button, input, textarea, label, a')) return
  props.onOpenNote(note)
}

function handleNotesPerPageInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  props.onNotesPerPageChange(value)
}

function handleNoteInput(event: Event) {
  props.onNoteInputChange((event.target as HTMLTextAreaElement).value)
}

function handleEditingInput(event: Event) {
  props.onEditingTextChange((event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <article class="theme-surface rounded-2xl border p-3 sm:p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold sm:text-base">Последние заметки</h2>
      <div class="flex items-center gap-2">
        <label :class="[mutedTextClass, 'flex items-center gap-2 text-xs']">
          <span>Показывать</span>
          <input
            :value="notesPerPage"
            type="number"
            min="4"
            max="20"
            :class="[inputClass, 'w-14 rounded-lg border px-2 py-1 outline-none']"
            @input="handleNotesPerPageInput"
          />
        </label>
        <button
          type="button"
          :class="[neutralButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 text-[11px] transition']"
          @click="onToggleNoteDiffs"
        >
          {{ showNoteDiffs ? 'Скрыть разницу' : 'Показывать разницу' }}
        </button>
      </div>
    </div>

    <form class="mb-3 space-y-2" @submit.prevent="onSubmitNote">
      <textarea
        :value="noteInput"
        rows="3"
        placeholder="Введите заметку..."
        :class="[inputClass, 'w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition']"
        @input="handleNoteInput"
        @keydown.ctrl.enter.prevent="onSubmitNote"
      />
      <p :class="[mutedTextClass, 'text-[11px]']">Подсказка: нажмите Ctrl+Enter, чтобы быстро сохранить заметку.</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          :disabled="isImproving || !noteInput.trim()"
          :class="[aiButtonClass, 'cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
          @click="onImproveCreateText"
        >
          {{ isImproving ? 'Улучшаю...' : 'Улучшить текст ИИ' }}
        </button>
        <button
          type="submit"
          :disabled="isCreating || !noteInput.trim()"
          :class="[primaryButtonClass, 'cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
        >
          {{ isCreating ? 'Сохраняю...' : 'Сохранить заметку' }}
        </button>
      </div>
    </form>

    <div v-if="isLoading" :class="[subtleSurfaceClass, 'rounded-xl border px-3 py-2 text-xs']">Загрузка...</div>
    <div v-else-if="isError" class="theme-error rounded-xl border px-3 py-2 text-xs">
      {{ errorMessage }}
    </div>

    <ul v-else-if="notes.length > 0" class="space-y-2">
      <template v-for="(note, index) in notes" :key="note.id">
      <li :class="['rounded-xl border px-3 transition cursor-pointer', noteCardClass, densityClass]">
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
              @change="onToggleNoteSelection(note.id)"
            />
          </label>
          <div class="min-w-0 flex-1 text-left">
            <p :class="[mainTextClass, 'max-h-10 overflow-hidden text-sm font-medium']">
              {{ note.text }}
            </p>
            <p :class="[mutedTextClass, 'text-xs']" :title="formatAbsoluteDate(note.createdAt)">
              {{ formatUiDate(note.createdAt) }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              :class="[neutralButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 text-[11px] transition']"
              @click.stop="onOpenNote(note)"
            >
              Открыть
            </button>
          </div>
        </div>

        <form v-else class="space-y-2" @submit.prevent="onSaveEdit(note.id)">
          <textarea
            :value="editingText"
            rows="3"
            :class="[inputClass, 'w-full resize-none rounded-lg border px-2 py-1.5 text-sm outline-none']"
            @input="handleEditingInput"
            @keydown.ctrl.enter.prevent="onSaveEdit(note.id)"
          />
          <p :class="[mutedTextClass, 'text-[11px]']">Подсказка: Ctrl+Enter сохраняет изменения.</p>
          <div class="flex justify-end gap-1">
            <button
              type="button"
              :disabled="isImproving || !editingText.trim()"
              :class="[aiButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
              @click="onImproveEditingText"
            >
              {{ isImproving ? 'Улучшаю...' : 'ИИ улучшить' }}
            </button>
            <button
              type="button"
              :class="[neutralButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 text-[11px] transition']"
              @click="onCancelEdit"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="isUpdating || !editingText.trim()"
              :class="[primaryButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
            >
              {{ isUpdating ? 'Сохр...' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </li>
      <li
        v-if="showNoteDiffs && index < notes.length - 1"
        :key="`gap-${note.id}`"
        :class="[subtleSurfaceClass, 'rounded-lg border px-2 py-1 text-[11px]']"
      >
        <span :class="mutedTextClass">Прошло:</span>
        <span :class="[mainTextClass, 'ml-1 font-medium']">{{ getNoteGapLabel(index) }}</span>
      </li>
      </template>
    </ul>
    <div v-else :class="[subtleSurfaceClass, 'rounded-xl border px-3 py-2 text-xs']">
      Пока нет заметок. Добавьте первую запись выше.
    </div>

    <div v-if="notes.length > 0" :class="[mutedTextClass, 'mt-2 flex items-center gap-2 text-[11px]']">
      <input
        :checked="isAllVisibleSelected"
        type="checkbox"
        :class="checkboxClass"
        @change="onToggleAllVisibleNotes(($event.target as HTMLInputElement).checked)"
      />
      <span>Выбрать все на текущей странице</span>
    </div>

    <div :class="[mutedTextClass, 'mt-3 flex items-center justify-between text-xs']">
      <p>Страница {{ currentPage }} из {{ totalPages }}</p>
      <div class="flex gap-1">
        <button
          type="button"
          :class="[neutralButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50']"
          :disabled="currentPage <= 1 || isLoading"
          @click="onPrevPage"
        >
          Назад
        </button>
        <button
          type="button"
          :class="[neutralButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50']"
          :disabled="currentPage >= totalPages || isLoading"
          @click="onNextPage"
        >
          Далее
        </button>
      </div>
    </div>
  </article>
</template>
