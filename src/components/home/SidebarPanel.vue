<script setup lang="ts">
import type { NoteGroup } from '@/composables/useNotes'

defineProps<{
  notesCount: number
  selectedGroupId: number | null
  activeGroupName: string
  selectedNotesCount: number
  groups: NoteGroup[]
  groupNameInput: string
  isCreatingGroup: boolean
  isDeletingGroup: boolean
  isGroupsLoading: boolean
  mainTextClass: string
  mutedTextClass: string
  surfaceClass: string
  subtleSurfaceClass: string
  inputClass: string
  neutralButtonClass: string
  selectedGroupButtonClass: string
  groupButtonClass: string
  dangerButtonClass: string
  statCardClass: string
  statValueClass: string
  statCaptionClass: string
  onGroupNameChange: (value: string) => void
  onClearSelection: () => void
  onSubmitCreateGroup: () => void
  onSwitchGroup: (groupId: number | null) => void
  onRemoveGroup: (groupId: number) => void
}>()
</script>

<template>
  <aside class="space-y-4">
    <article :class="[surfaceClass, 'rounded-2xl border p-3 sm:p-4']">
      <h3 class="mb-2 text-sm font-semibold">Статистика</h3>
      <div :class="[statCardClass, 'rounded-xl border px-3 py-3 text-left']">
        <p :class="[statValueClass, 'text-2xl font-semibold']">{{ notesCount }}</p>
        <p :class="[statCaptionClass, 'text-xs']">
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
            @click="onClearSelection"
          >
            Снять выбор
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <input
            :value="groupNameInput"
            type="text"
            placeholder="Название группы"
            :class="[inputClass, 'min-w-44 flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none']"
            @input="onGroupNameChange(($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            :disabled="isCreatingGroup || selectedNotesCount === 0 || !groupNameInput.trim()"
            :class="[groupButtonClass, 'cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50']"
            @click="onSubmitCreateGroup"
          >
            {{ isCreatingGroup ? 'Создаю...' : 'Создать группу' }}
          </button>
        </div>
      </div>

      <div class="mb-2 space-y-1.5">
        <button
          type="button"
          class="cursor-pointer rounded-lg border px-2 py-1 transition"
          :class="selectedGroupId === null ? selectedGroupButtonClass : neutralButtonClass"
          @click="onSwitchGroup(null)"
        >
          Все заметки
        </button>
        <div v-for="group in groups" :key="group.id" class="flex items-center gap-1.5">
          <button
            type="button"
            class="min-w-0 flex-1 cursor-pointer rounded-lg border px-2 py-1 text-left transition"
            :class="selectedGroupId === group.id ? selectedGroupButtonClass : neutralButtonClass"
            @click="onSwitchGroup(group.id)"
          >
            <span class="truncate">{{ group.name }} ({{ group.noteCount }})</span>
          </button>
          <button
            type="button"
            :disabled="isDeletingGroup"
            :class="[dangerButtonClass, 'cursor-pointer rounded-lg border px-2 py-1 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50']"
            @click="onRemoveGroup(group.id)"
          >
            {{ isDeletingGroup ? '...' : 'Удал.' }}
          </button>
        </div>
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
</template>
