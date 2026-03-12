<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useNow } from '@vueuse/core'

import {
  formatNoteDate,
  useNotes,
  type Note,
  type NoteComment,
  type NoteVersion,
} from '@/composables/useNotes'
import NoteModal from '@/components/home/NoteModal.vue'
import NotesPanel from '@/components/home/NotesPanel.vue'
import SidebarPanel from '@/components/home/SidebarPanel.vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const { notesPerPage, densityClass, timeDisplayMode, showNoteDiffs } = storeToRefs(uiStore)
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
  isDeletingGroup,
  isGroupsLoading,
  createNote,
  updateNote,
  deleteNote,
  improveText,
  createGroup,
  deleteGroup,
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
const isVersionsPanelOpen = ref(false)
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
const surfaceClass = computed(() => 'theme-surface')
const subtleSurfaceClass = computed(() => 'theme-subtle')
const inputClass = computed(() => 'theme-input')
const noteCardClass = computed(() => 'theme-note-card')
const mutedTextClass = computed(() => 'theme-text-muted')
const mainTextClass = computed(() => 'theme-text-main')
const neutralButtonClass = computed(() => 'theme-btn-neutral')
const checkboxClass = computed(() => 'theme-checkbox size-3.5 cursor-pointer')
const selectedGroupButtonClass = computed(() => 'theme-btn-selected')
const modalSurfaceClass = computed(() => 'theme-modal-surface')
const primaryButtonClass = computed(() => 'theme-btn-primary')
const aiButtonClass = computed(() => 'theme-btn-ai')
const dangerButtonClass = computed(() => 'theme-btn-danger')
const groupButtonClass = computed(() => 'theme-btn-group')
const statCardClass = computed(() => 'theme-stat-card')
const statValueClass = computed(() => 'theme-stat-value')
const statCaptionClass = computed(() => 'theme-stat-caption')
const modalOverlayClass = computed(() => 'theme-modal-overlay')
const now = useNow({ interval: 60_000 })

function setNotesPerPage(value: number) {
  notesPerPage.value = value
}

function setNoteInput(value: string) {
  noteInput.value = value
}

function setEditingText(value: string) {
  editingText.value = value
}

function setGroupNameInput(value: string) {
  groupNameInput.value = value
}

function setModalText(value: string) {
  modalText.value = value
}

function setNewCommentText(value: string) {
  newCommentText.value = value
}

function setEditingCommentText(value: string) {
  editingCommentText.value = value
}

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

async function removeGroup(groupId: number) {
  if (!window.confirm('Удалить группу? Заметки останутся.')) {
    return
  }

  await deleteGroup(groupId)

  if (selectedGroupId.value === groupId) {
    selectedGroupId.value = null
  }
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
  isVersionsPanelOpen.value = false
  void loadNoteComments(note.id)
}

function closeNoteModal() {
  openedNote.value = null
  modalText.value = ''
  noteVersions.value = []
  versionsError.value = ''
  isVersionsLoading.value = false
  isVersionsPanelOpen.value = false
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

function toggleVersionsPanel() {
  isVersionsPanelOpen.value = !isVersionsPanelOpen.value

  if (
    isVersionsPanelOpen.value &&
    openedNote.value &&
    !isVersionsLoading.value &&
    noteVersions.value.length === 0 &&
    !versionsError.value
  ) {
    void loadNoteVersions(openedNote.value.id)
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

function formatUiDate(value: string): string {
  return formatNoteDate(value, timeDisplayMode.value, now.value.getTime())
}

function formatAbsoluteDate(value: string): string {
  return formatNoteDate(value, 'absolute')
}

function formatGapBetweenNotes(newerDate: string, olderDate: string): string {
  const newer = new Date(newerDate).getTime()
  const older = new Date(olderDate).getTime()
  if (Number.isNaN(newer) || Number.isNaN(older)) return 'н/д'

  const diffMs = Math.max(0, newer - older)
  const totalMinutes = Math.floor(diffMs / 60_000)
  if (totalMinutes < 1) return 'меньше минуты'

  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []

  if (days > 0) parts.push(`${days}д`)
  if (hours > 0) parts.push(`${hours}ч`)
  if (minutes > 0) parts.push(`${minutes}м`)

  return parts.join(' ')
}

function getNoteGapLabel(index: number): string {
  const newer = notes.value[index]
  const older = notes.value[index + 1]
  if (!newer || !older) return ''
  return formatGapBetweenNotes(newer.createdAt, older.createdAt)
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
    <NotesPanel
      :notes-per-page="notesPerPage"
      :note-input="noteInput"
      :is-improving="isImproving"
      :is-creating="isCreating"
      :is-loading="isLoading"
      :is-error="isError"
      :error-message="error?.message ?? 'Не удалось загрузить заметки'"
      :notes="notes"
      :editing-id="editingId"
      :editing-text="editingText"
      :selected-note-ids="selectedNoteIds"
      :density-class="densityClass"
      :input-class="inputClass"
      :subtle-surface-class="subtleSurfaceClass"
      :note-card-class="noteCardClass"
      :muted-text-class="mutedTextClass"
      :main-text-class="mainTextClass"
      :neutral-button-class="neutralButtonClass"
      :checkbox-class="checkboxClass"
      :primary-button-class="primaryButtonClass"
      :ai-button-class="aiButtonClass"
      :is-all-visible-selected="isAllVisibleSelected"
      :show-note-diffs="showNoteDiffs"
      :current-page="currentPage"
      :total-pages="totalPages"
      :is-updating="isUpdating"
      :on-notes-per-page-change="setNotesPerPage"
      :on-note-input-change="setNoteInput"
      :on-submit-note="submitNote"
      :on-improve-create-text="improveCreateText"
      :on-toggle-note-selection="toggleNoteSelection"
      :on-open-note="openNoteModal"
      :on-editing-text-change="setEditingText"
      :on-save-edit="saveEdit"
      :on-cancel-edit="cancelEdit"
      :on-improve-editing-text="improveEditingText"
      :on-toggle-all-visible-notes="toggleAllVisibleNotes"
      :on-toggle-note-diffs="uiStore.toggleNoteDiffs"
      :on-prev-page="goToPreviousPage"
      :on-next-page="goToNextPage"
      :format-ui-date="formatUiDate"
      :format-absolute-date="formatAbsoluteDate"
      :get-note-gap-label="getNoteGapLabel"
    />

    <SidebarPanel
      :notes-count="notesCount"
      :selected-group-id="selectedGroupId"
      :active-group-name="activeGroupName"
      :selected-notes-count="selectedNotesCount"
      :groups="groups"
      :group-name-input="groupNameInput"
      :is-creating-group="isCreatingGroup"
      :is-deleting-group="isDeletingGroup"
      :is-groups-loading="isGroupsLoading"
      :main-text-class="mainTextClass"
      :muted-text-class="mutedTextClass"
      :surface-class="surfaceClass"
      :subtle-surface-class="subtleSurfaceClass"
      :input-class="inputClass"
      :neutral-button-class="neutralButtonClass"
      :selected-group-button-class="selectedGroupButtonClass"
      :group-button-class="groupButtonClass"
      :danger-button-class="dangerButtonClass"
      :stat-card-class="statCardClass"
      :stat-value-class="statValueClass"
      :stat-caption-class="statCaptionClass"
      :on-group-name-change="setGroupNameInput"
      :on-clear-selection="clearSelection"
      :on-submit-create-group="submitCreateGroup"
      :on-switch-group="switchGroup"
      :on-remove-group="removeGroup"
    />
  </section>

  <NoteModal
    :opened-note="openedNote"
    :modal-text="modalText"
    :note-versions="noteVersions"
    :is-versions-loading="isVersionsLoading"
    :versions-error="versionsError"
    :is-versions-panel-open="isVersionsPanelOpen"
    :note-comments="sortedNoteComments"
    :is-comments-loading="isCommentsLoading"
    :comments-error="commentsError"
    :new-comment-text="newCommentText"
    :editing-comment-id="editingCommentId"
    :editing-comment-text="editingCommentText"
    :is-deleting="isDeleting"
    :is-improving="isImproving"
    :is-updating="isUpdating"
    :is-restoring-version="isRestoringVersion"
    :is-creating-comment="isCreatingComment"
    :is-updating-comment="isUpdatingComment"
    :is-deleting-comment="isDeletingComment"
    :modal-overlay-class="modalOverlayClass"
    :modal-surface-class="modalSurfaceClass"
    :subtle-surface-class="subtleSurfaceClass"
    :input-class="inputClass"
    :muted-text-class="mutedTextClass"
    :main-text-class="mainTextClass"
    :neutral-button-class="neutralButtonClass"
    :primary-button-class="primaryButtonClass"
    :ai-button-class="aiButtonClass"
    :danger-button-class="dangerButtonClass"
    :format-ui-date="formatUiDate"
    :format-absolute-date="formatAbsoluteDate"
    :get-version-preview="getVersionPreview"
    :on-close="closeNoteModal"
    :on-modal-text-change="setModalText"
    :on-save="saveModalNote"
    :on-improve="improveModalText"
    :on-delete="deleteModalNote"
    :on-toggle-versions-panel="toggleVersionsPanel"
    :on-restore-version="restoreFromHistory"
    :on-new-comment-text-change="setNewCommentText"
    :on-submit-comment="submitComment"
    :on-start-edit-comment="startEditComment"
    :on-editing-comment-text-change="setEditingCommentText"
    :on-cancel-edit-comment="cancelEditComment"
    :on-save-comment-edit="saveCommentEdit"
    :on-remove-comment="removeComment"
  />
</template>
