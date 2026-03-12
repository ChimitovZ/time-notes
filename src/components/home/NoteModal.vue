<script setup lang="ts">
import type { Note, NoteComment, NoteVersion } from '@/composables/useNotes'

defineProps<{
  openedNote: Note | null
  modalText: string
  noteVersions: NoteVersion[]
  isVersionsLoading: boolean
  versionsError: string
  isVersionsPanelOpen: boolean
  noteComments: NoteComment[]
  isCommentsLoading: boolean
  commentsError: string
  newCommentText: string
  editingCommentId: number | null
  editingCommentText: string
  isDeleting: boolean
  isImproving: boolean
  isUpdating: boolean
  isRestoringVersion: boolean
  isCreatingComment: boolean
  isUpdatingComment: boolean
  isDeletingComment: boolean
  modalOverlayClass: string
  modalSurfaceClass: string
  subtleSurfaceClass: string
  inputClass: string
  mutedTextClass: string
  mainTextClass: string
  neutralButtonClass: string
  primaryButtonClass: string
  aiButtonClass: string
  dangerButtonClass: string
  formatUiDate: (value: string) => string
  formatAbsoluteDate: (value: string) => string
  getVersionPreview: (text: string) => string
  onClose: () => void
  onModalTextChange: (value: string) => void
  onSave: () => void
  onImprove: () => void
  onDelete: () => void
  onToggleVersionsPanel: () => void
  onRestoreVersion: (version: number) => void
  onNewCommentTextChange: (value: string) => void
  onSubmitComment: () => void
  onStartEditComment: (comment: NoteComment) => void
  onEditingCommentTextChange: (value: string) => void
  onCancelEditComment: () => void
  onSaveCommentEdit: (commentId: number) => void
  onRemoveComment: (commentId: number) => void
}>()
</script>

<template>
  <div
    v-if="openedNote"
    :class="[modalOverlayClass, 'fixed inset-0 z-50 flex items-center justify-center p-4']"
    @click.self="onClose"
  >
    <div :class="[modalSurfaceClass, 'w-full max-w-5xl rounded-2xl border p-4 shadow-xl']">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 :class="[mainTextClass, 'text-base font-semibold']">Полная заметка</h3>
          <p :class="[mutedTextClass, 'text-xs']" :title="formatAbsoluteDate(openedNote.createdAt)">
            {{ formatUiDate(openedNote.createdAt) }}
          </p>
          <p :class="[mutedTextClass, 'text-xs']">Текущая версия: v{{ openedNote.version }}</p>
        </div>
        <button
          type="button"
          :class="[neutralButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 text-[11px] transition']"
          @click="onClose"
        >
          Закрыть
        </button>
      </div>

      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <textarea
            :value="modalText"
            rows="10"
            :class="[inputClass, 'mb-2 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none']"
            @input="onModalTextChange(($event.target as HTMLTextAreaElement).value)"
            @keydown.ctrl.enter.prevent="onSave"
          />
          <p :class="[mutedTextClass, 'mb-2 text-[11px]']">Подсказка: Ctrl+Enter сохраняет изменения в заметке.</p>

          <div :class="[subtleSurfaceClass, 'mb-3 rounded-xl border p-2.5']">
            <p :class="[mainTextClass, 'mb-2 text-xs font-semibold']">Комментарии</p>
            <form class="mb-2 space-y-1.5" @submit.prevent="onSubmitComment">
              <textarea
                :value="newCommentText"
                rows="2"
                placeholder="Добавьте комментарий..."
                :class="[inputClass, 'w-full resize-y rounded-lg border px-2 py-1.5 text-xs outline-none']"
                @input="onNewCommentTextChange(($event.target as HTMLTextAreaElement).value)"
                @keydown.ctrl.enter.prevent="onSubmitComment"
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="isCreatingComment || !newCommentText.trim()"
                  :class="[primaryButtonClass, 'cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
                >
                  {{ isCreatingComment ? 'Добавляю...' : 'Добавить' }}
                </button>
              </div>
            </form>

            <p v-if="isCommentsLoading" :class="[mutedTextClass, 'text-[11px]']">Загрузка комментариев...</p>
            <p v-else-if="commentsError" class="text-[11px] text-rose-500">{{ commentsError }}</p>
            <ul v-else-if="noteComments.length > 0" class="max-h-40 space-y-1.5 overflow-y-auto pr-1">
              <li
                v-for="comment in noteComments"
                :key="comment.id"
                :class="[inputClass, 'rounded-lg border px-2 py-1.5']"
              >
                <div v-if="editingCommentId !== comment.id" class="space-y-1">
                  <p :class="[mainTextClass, 'text-[11px] leading-relaxed']">{{ comment.text }}</p>
                  <div class="flex items-center justify-between gap-2">
                    <p :class="[mutedTextClass, 'text-[10px]']" :title="formatAbsoluteDate(comment.createdAt)">
                      {{ formatUiDate(comment.createdAt) }}
                    </p>
                    <div class="flex gap-1">
                      <button
                        type="button"
                        :class="[neutralButtonClass, 'cursor-pointer rounded-md border px-2 py-0.5 text-[10px] transition']"
                        @click="onStartEditComment(comment)"
                      >
                        Изм.
                      </button>
                      <button
                        type="button"
                        :disabled="isDeletingComment"
                        :class="[dangerButtonClass, 'cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50']"
                        @click="onRemoveComment(comment.id)"
                      >
                        Удал.
                      </button>
                    </div>
                  </div>
                </div>
                <form v-else class="space-y-1.5" @submit.prevent="onSaveCommentEdit(comment.id)">
                  <textarea
                    :value="editingCommentText"
                    rows="2"
                    :class="[inputClass, 'w-full resize-y rounded-md border px-2 py-1 text-[11px] outline-none']"
                    @input="onEditingCommentTextChange(($event.target as HTMLTextAreaElement).value)"
                  />
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      :class="[neutralButtonClass, 'cursor-pointer rounded-md border px-2 py-0.5 text-[10px] transition']"
                      @click="onCancelEditComment"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      :disabled="isUpdatingComment || !editingCommentText.trim()"
                      :class="[primaryButtonClass, 'cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
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
              :class="[dangerButtonClass, 'cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
              @click="onDelete"
            >
              {{ isDeleting ? 'Удаляю...' : 'Удалить' }}
            </button>
            <button
              type="button"
              :disabled="isImproving || !modalText.trim()"
              :class="[aiButtonClass, 'cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
              @click="onImprove"
            >
              {{ isImproving ? 'Улучшаю...' : 'Улучшить ИИ' }}
            </button>
            <button
              type="button"
              :disabled="isUpdating || !modalText.trim()"
              :class="[primaryButtonClass, 'cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
              @click="onSave"
            >
              {{ isUpdating ? 'Сохр...' : 'Сохранить' }}
            </button>
          </div>
        </div>

        <aside class="space-y-2">
          <button
            type="button"
            :class="[neutralButtonClass, 'w-full cursor-pointer rounded-xl border px-3 py-2 text-xs font-semibold transition']"
            @click="onToggleVersionsPanel"
          >
            {{ isVersionsPanelOpen ? 'Скрыть историю версий' : 'Показать историю версий' }}
          </button>

          <div v-if="isVersionsPanelOpen" :class="[subtleSurfaceClass, 'rounded-xl border p-2.5']">
            <p :class="[mainTextClass, 'mb-2 text-xs font-semibold']">История версий</p>
            <p v-if="isVersionsLoading" :class="[mutedTextClass, 'text-[11px]']">Загрузка...</p>
            <p v-else-if="versionsError" class="text-[11px] text-rose-500">{{ versionsError }}</p>
            <ul v-else-if="noteVersions.length > 0" class="max-h-80 space-y-1 overflow-y-auto pr-1">
              <li
                v-for="versionItem in noteVersions"
                :key="versionItem.version"
                class="flex items-center justify-between gap-2"
              >
                <div class="min-w-0">
                  <p :class="[mainTextClass, 'truncate text-[11px] font-medium']">
                    {{ getVersionPreview(versionItem.text) }}
                  </p>
                  <p
                    :class="[mutedTextClass, 'truncate text-[10px]']"
                    :title="formatAbsoluteDate(versionItem.createdAt)"
                  >
                    v{{ versionItem.version }} • {{ formatUiDate(versionItem.createdAt) }}
                  </p>
                </div>
                <button
                  type="button"
                  :disabled="isRestoringVersion || versionItem.version === openedNote.version"
                  :class="[neutralButtonClass, 'cursor-pointer rounded-md border px-2 py-1 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-50']"
                  @click="onRestoreVersion(versionItem.version)"
                >
                  Восст.
                </button>
              </li>
            </ul>
            <p v-else :class="[mutedTextClass, 'text-[11px]']">История пока пустая.</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
