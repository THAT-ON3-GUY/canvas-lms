/*
 * Copyright (C) 2026 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import {useScope as createI18nScope} from '@canvas/i18n'
import {Alert} from '@instructure/ui-alerts'
import {Button, IconButton} from '@instructure/ui-buttons'
import {Heading} from '@instructure/ui-heading'
import {IconEditLine, IconExternalLinkLine, IconTrashLine} from '@instructure/ui-icons'
import {Link} from '@instructure/ui-link'
import {List} from '@instructure/ui-list'
import {showFlashAlert} from '@instructure/platform-alerts'
import {Spinner} from '@instructure/ui-spinner'
import {Text} from '@instructure/ui-text'
import {TextArea} from '@instructure/ui-text-area'
import {TextInput} from '@instructure/ui-text-input'
import {View} from '@instructure/ui-view'
import React, {useEffect, useMemo, useState} from 'react'
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {
  deleteTextClip,
  fetchTextClipsPage,
  textClipsIndexPath,
  undeleteTextClip,
  updateTextClip,
} from '../../../text_clips/api'
import type {TextClipRecord, TextClipUpdate} from '../../../text_clips/types'

const I18n = createI18nScope('text_clips')
const SEARCH_DEBOUNCE_MS = 250
const UNDO_TIMEOUT_MS = 8000

type EditDraft = {content: string; note: string}
type PendingUndo = {id: number | string; preview: string}

function clipPreview(content: string | null | undefined, max = 160) {
  const oneLine = (content ?? '').replace(/\s+/g, ' ').trim()
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max)}…`
}

export function sourceLinkLabel(clip: TextClipRecord): string {
  if (clip.source_title) {
    return clip.source_title
  }
  if (!clip.source_url) {
    return ''
  }
  try {
    return new URL(clip.source_url).host
  } catch (_e) {
    return clip.source_url
  }
}

type TextClipListItemProps = {
  clip: TextClipRecord
  editingId: number | string | null
  editDraft: EditDraft | null
  onStartEdit: (clip: TextClipRecord) => void
  onEditDraftChange: (draft: EditDraft) => void
  onCancelEdit: () => void
  onSaveEdit: (id: number | string, body: TextClipUpdate) => void
  onDelete: (clip: TextClipRecord) => void
  isSaving: boolean
  isDeleting: boolean
}

function TextClipListItem({
  clip,
  editingId,
  editDraft,
  onStartEdit,
  onEditDraftChange,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isSaving,
  isDeleting,
}: TextClipListItemProps) {
  const isEditing = editingId === clip.id

  return (
    <List.Item>
      <View display="block">
        {isEditing && editDraft ? (
          <>
            <TextArea
              label={I18n.t('Clip content')}
              value={editDraft.content}
              onChange={event => onEditDraftChange({...editDraft, content: event.target.value})}
              data-testid={`text-clip-edit-content-${clip.id}`}
            />
            <View margin="x-small 0 0 0">
              <TextArea
                label={I18n.t('Note')}
                value={editDraft.note}
                onChange={event => onEditDraftChange({...editDraft, note: event.target.value})}
                data-testid={`text-clip-edit-note-${clip.id}`}
              />
            </View>
            <View margin="x-small 0 0 0">
              <Button
                size="small"
                margin="0 x-small 0 0"
                data-testid={`text-clip-save-${clip.id}`}
                onClick={() =>
                  onSaveEdit(clip.id, {
                    content: editDraft.content,
                    note: editDraft.note,
                  })
                }
                interaction={isSaving ? 'disabled' : 'enabled'}
              >
                {I18n.t('Save')}
              </Button>
              <Button
                size="small"
                data-testid={`text-clip-cancel-${clip.id}`}
                onClick={onCancelEdit}
                interaction={isSaving ? 'disabled' : 'enabled'}
              >
                {I18n.t('Cancel')}
              </Button>
            </View>
          </>
        ) : (
          <>
            <Text>{clipPreview(clip.content)}</Text>
            {clip.note && (
              <View margin="xx-small 0 0 0">
                <Text
                  as="div"
                  size="small"
                  fontStyle="italic"
                  data-testid={`text-clip-note-${clip.id}`}
                >
                  {clipPreview(clip.note, 120)}
                </Text>
              </View>
            )}
            <View margin="xx-small 0 0 0">
              {clip.source_url && (
                <Link
                  isWithinText={false}
                  href={clip.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`text-clip-source-${clip.id}`}
                  margin="0 x-small 0 0"
                >
                  {sourceLinkLabel(clip)}
                  <IconExternalLinkLine size="x-small" style={{paddingLeft: '0.3em'}} />
                </Link>
              )}
              <IconButton
                size="small"
                margin="0 x-small 0 0"
                screenReaderLabel={I18n.t('Edit clip')}
                renderIcon={IconEditLine}
                data-testid={`text-clip-edit-${clip.id}`}
                onClick={() => onStartEdit(clip)}
                interaction={isDeleting ? 'disabled' : 'enabled'}
              />
              <IconButton
                size="small"
                screenReaderLabel={I18n.t('Delete clip')}
                renderIcon={IconTrashLine}
                data-testid={`text-clip-delete-${clip.id}`}
                onClick={() => onDelete(clip)}
                interaction={isDeleting ? 'disabled' : 'enabled'}
              />
            </View>
          </>
        )}
      </View>
    </List.Item>
  )
}

export default function TextClipsTray() {
  const queryClient = useQueryClient()
  const courseId = window.ENV.COURSE_ID
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    if (!pendingUndo) return undefined
    const handle = window.setTimeout(() => setPendingUndo(null), UNDO_TIMEOUT_MS)
    return () => window.clearTimeout(handle)
  }, [pendingUndo])

  const searchTooShort = debouncedSearch.length === 1

  const queryKey = ['text_clips', courseId, debouncedSearch] as const

  const {data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage} =
    useInfiniteQuery({
      queryKey,
      queryFn: ({pageParam}) => fetchTextClipsPage(pageParam),
      getNextPageParam: page => page.nextPage ?? undefined,
      initialPageParam: textClipsIndexPath(courseId as string | number, {
        q: debouncedSearch || undefined,
      }),
      enabled: Boolean(courseId) && !searchTooShort,
    })

  const clips = useMemo(() => data?.pages.flatMap(page => page.json) ?? [], [data?.pages])

  const invalidateClips = () => {
    void queryClient.invalidateQueries({queryKey: ['text_clips', courseId]})
  }

  useEffect(() => {
    const onCreated = () => {
      setEditingId(null)
      setEditDraft(null)
      invalidateClips()
    }
    window.addEventListener('text-clips:created', onCreated)
    return () => window.removeEventListener('text-clips:created', onCreated)
  }, [queryClient, courseId])

  const updateMutation = useMutation({
    mutationFn: ({id, body}: {id: number | string; body: TextClipUpdate}) =>
      updateTextClip(courseId as string | number, id, body),
    onSuccess: () => {
      setEditingId(null)
      setEditDraft(null)
      invalidateClips()
    },
  })

  const undoMutation = useMutation({
    mutationFn: (id: number | string) => undeleteTextClip(courseId as string | number, id),
    onSuccess: () => {
      setPendingUndo(null)
      invalidateClips()
      showFlashAlert({message: I18n.t('Clip restored'), type: 'success'})
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteTextClip(courseId as string | number, id),
    onSuccess: (_data, id) => {
      const deleted = clips.find(clip => clip.id === id)
      setPendingUndo({
        id,
        preview: deleted ? clipPreview(deleted.content, 80) : I18n.t('Clip'),
      })
      setEditingId(null)
      setEditDraft(null)
      invalidateClips()
      showFlashAlert({message: I18n.t('Clip deleted'), type: 'success'})
    },
  })

  const startEdit = (clip: TextClipRecord) => {
    setEditingId(clip.id)
    setEditDraft({content: clip.content, note: clip.note ?? ''})
  }

  return (
    <View as="div" padding="medium" id="text_clips_tray">
      <Heading level="h3" as="h2">
        {I18n.t('Text clips')}
      </Heading>
      <hr role="presentation" />

      <View margin="small 0">
        <TextInput
          renderLabel={I18n.t('Search clips')}
          placeholder={I18n.t('Search by content, note, or page title')}
          value={searchInput}
          onChange={(_e, value) => setSearchInput(value)}
          data-testid="text-clips-search-input"
        />
      </View>

      {pendingUndo && (
        <View margin="small 0" data-testid="text-clips-undo-alert">
          <Alert variant="info">
            <Text>{I18n.t('Deleted "%{preview}".', {preview: pendingUndo.preview})}</Text>
            <Button
              size="small"
              margin="x-small 0 0 0"
              data-testid="text-clips-undo-button"
              onClick={() => undoMutation.mutate(pendingUndo.id)}
              interaction={undoMutation.isPending ? 'disabled' : 'enabled'}
            >
              {I18n.t('Undo')}
            </Button>
          </Alert>
        </View>
      )}

      {searchTooShort && (
        <Text color="danger" data-testid="text-clips-search-error">
          {I18n.t('Search term must be at least 2 characters.')}
        </Text>
      )}

      {isLoading && !searchTooShort && (
        <View margin="small 0">
          <Spinner delay={200} size="small" renderTitle={I18n.t('Loading')} />
        </View>
      )}

      {isError && !searchTooShort && <Text color="danger">{I18n.t('Unable to load clips.')}</Text>}

      {!isLoading && !isError && !searchTooShort && clips.length === 0 && debouncedSearch && (
        <Text data-testid="text-clips-no-results">
          {I18n.t('No clips match "%{term}".', {term: debouncedSearch})}
        </Text>
      )}

      {!isLoading && !isError && !searchTooShort && clips.length === 0 && !debouncedSearch && (
        <Text>
          {I18n.t(
            'No clips yet — highlight text on a page in this course and click Clip to save it here.',
          )}
        </Text>
      )}

      {!isLoading && !isError && !searchTooShort && clips.length > 0 && (
        <>
          <List isUnstyled margin="small 0" itemSpacing="small">
            {clips.map(clip => (
              <TextClipListItem
                key={String(clip.id)}
                clip={clip}
                editingId={editingId}
                editDraft={editDraft}
                onStartEdit={startEdit}
                onEditDraftChange={setEditDraft}
                onCancelEdit={() => {
                  setEditingId(null)
                  setEditDraft(null)
                }}
                onSaveEdit={(id, body) => updateMutation.mutate({id, body})}
                onDelete={clipToDelete => deleteMutation.mutate(clipToDelete.id)}
                isSaving={updateMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </List>
          {hasNextPage && (
            <View margin="small 0 0 0">
              <Button
                data-testid="text-clips-load-more"
                onClick={() => fetchNextPage()}
                interaction={isFetchingNextPage ? 'disabled' : 'enabled'}
              >
                {isFetchingNextPage ? I18n.t('Loading…') : I18n.t('Load more')}
              </Button>
            </View>
          )}
        </>
      )}
    </View>
  )
}
