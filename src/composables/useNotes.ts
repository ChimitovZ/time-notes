import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'

import { http } from '@/lib/http'

const noteSchema = z.object({
  id: z.number(),
  text: z.string(),
  createdAt: z.string(),
  version: z.number().int().min(1),
  starred: z.boolean().default(false),
})
const groupSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
  noteCount: z.number().int().min(0),
})

const notesSchema = z.array(noteSchema)
const noteVersionSchema = z.object({
  version: z.number().int().min(1),
  text: z.string(),
  createdAt: z.string(),
})
const noteCommentSchema = z.object({
  id: z.number().int().min(1),
  noteId: z.number().int().min(1),
  text: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
const groupsSchema = z.array(groupSchema)
const noteVersionsSchema = z.array(noteVersionSchema)
const noteCommentsSchema = z.array(noteCommentSchema)
const paginatedNotesSchema = z.object({
  items: notesSchema,
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
})
const createNoteSchema = z.object({
  text: z.string().trim().min(1).max(4000),
})
const improveResponseSchema = z.object({
  text: z.string(),
})
const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  noteIds: z.array(z.number().int().min(1)).min(1),
})

export type Note = z.infer<typeof noteSchema>
export type NoteVersion = z.infer<typeof noteVersionSchema>
export type NoteComment = z.infer<typeof noteCommentSchema>
export type NoteGroup = z.infer<typeof groupSchema>
export type PaginatedNotes = z.infer<typeof paginatedNotesSchema>

async function fetchNotes(limit: number, offset: number, groupId: number | null): Promise<PaginatedNotes> {
  const response = await http.get('/notes', {
    params: {
      limit,
      offset,
      ...(groupId ? { groupId } : {}),
    },
  })
  const parsed = paginatedNotesSchema.safeParse(response.data)

  if (!parsed.success) {
    throw new Error('Сервер вернул данные в неверном формате')
  }

  return parsed.data
}

async function fetchGroups(): Promise<NoteGroup[]> {
  const response = await http.get('/groups')
  const parsed = groupsSchema.safeParse(response.data)

  if (!parsed.success) {
    throw new Error('Сервер вернул данные групп в неверном формате')
  }

  return parsed.data
}

async function createNote(rawText: string): Promise<Note> {
  const parsedInput = createNoteSchema.safeParse({ text: rawText })

  if (!parsedInput.success) {
    throw new Error('Текст заметки пустой или слишком длинный')
  }

  const response = await http.post('/notes', parsedInput.data)
  const parsedOutput = noteSchema.safeParse(response.data)

  if (!parsedOutput.success) {
    throw new Error('Сервер вернул данные в неверном формате')
  }

  return parsedOutput.data
}

async function updateNote(payload: { id: number; text: string }): Promise<Note> {
  const parsedInput = createNoteSchema.safeParse({ text: payload.text })

  if (!parsedInput.success) {
    throw new Error('Текст заметки пустой или слишком длинный')
  }

  const response = await http.patch(`/notes/${payload.id}`, parsedInput.data)
  const parsedOutput = noteSchema.safeParse(response.data)

  if (!parsedOutput.success) {
    throw new Error('Сервер вернул данные в неверном формате')
  }

  return parsedOutput.data
}

async function toggleNoteStar(payload: { id: number; starred: boolean }): Promise<Note> {
  const response = await http.patch(`/notes/${payload.id}/star`, { starred: payload.starred })
  const parsedOutput = noteSchema.safeParse(response.data)

  if (!parsedOutput.success) {
    throw new Error('Сервер вернул данные в неверном формате')
  }

  return parsedOutput.data
}

async function deleteNote(id: number): Promise<void> {
  await http.delete(`/notes/${id}`)
}

async function improveText(rawText: string): Promise<string> {
  const parsedInput = createNoteSchema.safeParse({ text: rawText })

  if (!parsedInput.success) {
    throw new Error('Текст заметки пустой или слишком длинный')
  }

  const response = await http.post('/ai/improve', parsedInput.data)
  const parsedOutput = improveResponseSchema.safeParse(response.data)

  if (!parsedOutput.success) {
    throw new Error('Сервер вернул данные в неверном формате')
  }

  return parsedOutput.data.text
}

async function createGroup(payload: { name: string; noteIds: number[] }): Promise<NoteGroup> {
  const parsedInput = createGroupSchema.safeParse(payload)

  if (!parsedInput.success) {
    throw new Error('Введите название группы и выберите хотя бы одну заметку')
  }

  const response = await http.post('/groups', parsedInput.data)
  const parsedOutput = groupSchema.safeParse(response.data)

  if (!parsedOutput.success) {
    throw new Error('Сервер вернул данные группы в неверном формате')
  }

  return parsedOutput.data
}

async function deleteGroup(groupId: number): Promise<void> {
  await http.delete(`/groups/${groupId}`)
}

async function fetchNoteVersions(noteId: number): Promise<NoteVersion[]> {
  const response = await http.get(`/notes/${noteId}/versions`)
  const parsed = noteVersionsSchema.safeParse(response.data)

  if (!parsed.success) {
    throw new Error('Сервер вернул историю версий в неверном формате')
  }

  return parsed.data
}

async function restoreNoteVersion(payload: { noteId: number; version: number }): Promise<Note> {
  const response = await http.post(`/notes/${payload.noteId}/versions/${payload.version}/restore`)
  const parsed = noteSchema.safeParse(response.data)

  if (!parsed.success) {
    throw new Error('Сервер вернул данные в неверном формате')
  }

  return parsed.data
}

async function fetchNoteComments(noteId: number): Promise<NoteComment[]> {
  const response = await http.get(`/notes/${noteId}/comments`)
  const parsed = noteCommentsSchema.safeParse(response.data)

  if (!parsed.success) {
    throw new Error('Сервер вернул комментарии в неверном формате')
  }

  return parsed.data
}

async function createNoteComment(payload: { noteId: number; text: string }): Promise<NoteComment> {
  const parsedInput = createNoteSchema.safeParse({ text: payload.text })

  if (!parsedInput.success) {
    throw new Error('Текст комментария пустой или слишком длинный')
  }

  const response = await http.post(`/notes/${payload.noteId}/comments`, parsedInput.data)
  const parsed = noteCommentSchema.safeParse(response.data)

  if (!parsed.success) {
    throw new Error('Сервер вернул данные комментария в неверном формате')
  }

  return parsed.data
}

async function updateNoteComment(payload: { commentId: number; text: string }): Promise<NoteComment> {
  const parsedInput = createNoteSchema.safeParse({ text: payload.text })

  if (!parsedInput.success) {
    throw new Error('Текст комментария пустой или слишком длинный')
  }

  const response = await http.patch(`/comments/${payload.commentId}`, parsedInput.data)
  const parsed = noteCommentSchema.safeParse(response.data)

  if (!parsed.success) {
    throw new Error('Сервер вернул данные комментария в неверном формате')
  }

  return parsed.data
}

async function deleteNoteComment(commentId: number): Promise<void> {
  await http.delete(`/comments/${commentId}`)
}

export function formatNoteDate(
  value: string,
  mode: 'relative' | 'absolute' = 'absolute',
  nowMs = Date.now(),
): string {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  if (mode === 'relative') {
    const diffMs = parsed.getTime() - nowMs
    const abs = Math.abs(diffMs)
    const rtf = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' })

    if (abs < 60_000) {
      return rtf.format(Math.round(diffMs / 1000), 'second')
    }
    if (abs < 3_600_000) {
      return rtf.format(Math.round(diffMs / 60_000), 'minute')
    }
    if (abs < 86_400_000) {
      return rtf.format(Math.round(diffMs / 3_600_000), 'hour')
    }
    if (abs < 2_592_000_000) {
      return rtf.format(Math.round(diffMs / 86_400_000), 'day')
    }
    if (abs < 31_536_000_000) {
      return rtf.format(Math.round(diffMs / 2_592_000_000), 'month')
    }

    return rtf.format(Math.round(diffMs / 31_536_000_000), 'year')
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed)
}

export function useNotes(
  limit: MaybeRefOrGetter<number>,
  page: MaybeRefOrGetter<number>,
  groupId: MaybeRefOrGetter<number | null> = null,
) {
  const queryClient = useQueryClient()
  const safeLimit = computed(() => Math.max(1, Math.floor(toValue(limit))))
  const safePage = computed(() => Math.max(1, Math.floor(toValue(page))))
  const offset = computed(() => (safePage.value - 1) * safeLimit.value)
  const selectedGroupId = computed(() => toValue(groupId))

  const query = useQuery({
    queryKey: computed(() => ['notes', safeLimit.value, offset.value, selectedGroupId.value]),
    queryFn: ({ queryKey }) => {
      const [, currentLimit, currentOffset, currentGroupId] = queryKey as [
        string,
        number,
        number,
        number | null,
      ]
      return fetchNotes(currentLimit, currentOffset, currentGroupId)
    },
  })
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
  })

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
  const updateMutation = useMutation({
    mutationFn: updateNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
  const toggleStarMutation = useMutation({
    mutationFn: toggleNoteStar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
  const improveMutation = useMutation({
    mutationFn: improveText,
  })
  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] })
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
  const restoreVersionMutation = useMutation({
    mutationFn: restoreNoteVersion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
  const createCommentMutation = useMutation({
    mutationFn: createNoteComment,
  })
  const updateCommentMutation = useMutation({
    mutationFn: updateNoteComment,
  })
  const deleteCommentMutation = useMutation({
    mutationFn: deleteNoteComment,
  })

  const notesCount = computed(() => query.data.value?.total ?? 0)
  const notes = computed(() => query.data.value?.items ?? [])
  const groups = computed(() => groupsQuery.data.value ?? [])

  return {
    ...query,
    notes,
    groups,
    createNote: createMutation.mutateAsync,
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    toggleNoteStar: toggleStarMutation.mutateAsync,
    improveText: improveMutation.mutateAsync,
    createGroup: createGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
    fetchNoteVersions,
    restoreNoteVersion: restoreVersionMutation.mutateAsync,
    fetchNoteComments,
    createNoteComment: createCommentMutation.mutateAsync,
    updateNoteComment: updateCommentMutation.mutateAsync,
    deleteNoteComment: deleteCommentMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTogglingStar: toggleStarMutation.isPending,
    isImproving: improveMutation.isPending,
    isCreatingGroup: createGroupMutation.isPending,
    isDeletingGroup: deleteGroupMutation.isPending,
    isRestoringVersion: restoreVersionMutation.isPending,
    isCreatingComment: createCommentMutation.isPending,
    isUpdatingComment: updateCommentMutation.isPending,
    isDeletingComment: deleteCommentMutation.isPending,
    isGroupsLoading: groupsQuery.isLoading,
    notesCount,
  }
}
