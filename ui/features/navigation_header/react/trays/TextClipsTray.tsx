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
import {Checkbox} from '@instructure/ui-checkbox'
import {Flex} from '@instructure/ui-flex'
import {Heading} from '@instructure/ui-heading'
import {
  IconCopyLine,
  IconEditLine,
  IconExternalLinkLine,
  IconLinkLine,
  IconPinLine,
  IconPinSolid,
  IconTrashLine,
} from '@instructure/ui-icons'
import {Link} from '@instructure/ui-link'
import {List} from '@instructure/ui-list'
import {SimpleSelect} from '@instructure/ui-simple-select'
import {showFlashAlert} from '@instructure/platform-alerts'
import {Spinner} from '@instructure/ui-spinner'
import {Tag} from '@instructure/ui-tag'
import {Text} from '@instructure/ui-text'
import {TextArea} from '@instructure/ui-text-area'
import {TextInput} from '@instructure/ui-text-input'
import {View} from '@instructure/ui-view'
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  createClipTag,
  deleteClipTag,
  deleteGlobalTextClip,
  deleteTextClip,
  fetchClipTags,
  fetchTextClipsPage,
  globalTextClipsIndexPath,
  shareGlobalTextClip,
  shareTextClip,
  textClipsIndexPath,
  undeleteGlobalTextClip,
  undeleteTextClip,
  unshareGlobalTextClip,
  unshareTextClip,
  updateClipTag,
  updateGlobalTextClip,
  updateTextClip,
} from '../../../text_clips/api'
import {buildCitation, copyClipContent, copyPlainText} from '../../../text_clips/clipCopy'
import {downloadClipsExport, type ExportFormat} from '../../../text_clips/exportClips'
import {sourceUrlWithHighlight} from '../../../text_clips/highlightRestore'
import {CLIP_TAG_PALETTE, CLIP_TAG_THEME} from '../../../text_clips/tagColors'
import type {
  ClipSort,
  ClipTagColor,
  ClipTagRecord,
  TextClipRecord,
  TextClipTagStub,
  TextClipUpdate,
} from '../../../text_clips/types'

const I18n = createI18nScope('text_clips')
const SEARCH_DEBOUNCE_MS = 250
const UNDO_TIMEOUT_MS = 8000

type EditDraft = {content: string; note: string; tag_ids: Array<number | string>}
type PendingUndo = {id: number | string; preview: string}

function ClipTagChip({
  tag,
  selected,
  onClick,
  testId,
}: {
  tag: TextClipTagStub | ClipTagRecord
  selected?: boolean
  onClick?: () => void
  testId?: string
}) {
  const theme = CLIP_TAG_THEME[tag.color]
  return (
    <Tag
      text={tag.name}
      margin="0 x-small x-small 0"
      data-testid={testId}
      onClick={onClick}
      themeOverride={{
        defaultBackground: selected ? theme.borderColor : theme.background,
        defaultBorderColor: theme.borderColor,
        defaultColor: selected ? '#FFFFFF' : theme.color,
      }}
    />
  )
}

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
  allTags: ClipTagRecord[]
  showCourseLabel?: boolean
  onStartEdit: (clip: TextClipRecord) => void
  onEditDraftChange: (draft: EditDraft) => void
  onCancelEdit: () => void
  onSaveEdit: (id: number | string, body: TextClipUpdate) => void
  onDelete: (clip: TextClipRecord) => void
  onTogglePin: (clip: TextClipRecord) => void
  onToggleEditTag: (tagId: number | string) => void
  sharePanelOpen: boolean
  onToggleSharePanel: () => void
  onCreateShare: () => void
  onRevokeShare: () => void
  onCopyShareLink: (url: string) => void
  onCopyClip: (clip: TextClipRecord) => void
  onCopyCitation: (clip: TextClipRecord) => void
  bulkSelected: boolean
  onToggleBulkSelect: () => void
  onRowKeyDown: (event: React.KeyboardEvent, index: number) => void
  rowIndex: number
  isSaving: boolean
  isDeleting: boolean
  isPinning: boolean
  isSharing: boolean
}

function TextClipListItem({
  clip,
  editingId,
  editDraft,
  allTags,
  showCourseLabel,
  onStartEdit,
  onEditDraftChange,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onTogglePin,
  onToggleEditTag,
  sharePanelOpen,
  onToggleSharePanel,
  onCreateShare,
  onRevokeShare,
  onCopyShareLink,
  onCopyClip,
  onCopyCitation,
  bulkSelected,
  onToggleBulkSelect,
  onRowKeyDown,
  rowIndex,
  isSaving,
  isDeleting,
  isPinning,
  isSharing,
}: TextClipListItemProps) {
  const isEditing = editingId === clip.id
  const sharePanelRef = useRef<Element | null>(null)
  const shareToggleRef = useRef<Element | null>(null)

  useEffect(() => {
    if (isEditing) {
      document
        .querySelector<HTMLTextAreaElement>(`[data-testid="text-clip-edit-content-${clip.id}"]`)
        ?.focus()
    }
  }, [isEditing, clip.id])

  useEffect(() => {
    if (sharePanelOpen) {
      const focusable = sharePanelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, textarea, select',
      )
      focusable?.focus()
    } else {
      ;(shareToggleRef.current as HTMLElement | null)?.focus()
    }
  }, [sharePanelOpen])

  return (
    <List.Item>
      <View
        display="block"
        tabIndex={0}
        data-clip-row={String(clip.id)}
        onKeyDown={event => onRowKeyDown(event, rowIndex)}
      >
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
              <Text as="div" size="small" weight="bold">
                {I18n.t('Tags')}
              </Text>
              <Flex wrap="wrap" margin="xx-small 0 0 0">
                {allTags.map(tag => (
                  <ClipTagChip
                    key={String(tag.id)}
                    tag={tag}
                    selected={editDraft.tag_ids.includes(tag.id)}
                    onClick={() => onToggleEditTag(tag.id)}
                    testId={`text-clip-edit-tag-${clip.id}-${tag.id}`}
                  />
                ))}
              </Flex>
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
                    tag_ids: editDraft.tag_ids,
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
            <Flex alignItems="start" gap="x-small">
              <Checkbox
                label={I18n.t('Select clip')}
                checked={bulkSelected}
                onChange={onToggleBulkSelect}
                data-testid={`text-clip-select-${clip.id}`}
              />
              <View display="block" width="100%">
                <Flex alignItems="center" gap="xx-small">
                  {clip.pinned && (
                    <IconPinSolid
                      size="x-small"
                      color="secondary"
                      data-testid={`text-clip-pinned-${clip.id}`}
                    />
                  )}
                  {clip.content_html ? (
                    <View
                      as="div"
                      maxHeight="12rem"
                      overflowY="auto"
                      data-testid={`text-clip-rich-${clip.id}`}
                      dangerouslySetInnerHTML={{__html: clip.content_html}}
                    />
                  ) : (
                    <Text>{clipPreview(clip.content)}</Text>
                  )}
                </Flex>
                {clip.tags && clip.tags.length > 0 && (
                  <Flex
                    wrap="wrap"
                    margin="xx-small 0 0 0"
                    data-testid={`text-clip-tags-${clip.id}`}
                  >
                    {clip.tags.map(tag => (
                      <ClipTagChip
                        key={String(tag.id)}
                        tag={tag}
                        testId={`text-clip-tag-${clip.id}-${tag.id}`}
                      />
                    ))}
                  </Flex>
                )}
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
                {showCourseLabel && clip.course && (
                  <Text
                    as="div"
                    size="x-small"
                    color="secondary"
                    data-testid={`text-clip-course-${clip.id}`}
                  >
                    {clip.course.name}
                  </Text>
                )}
                {clip.share && (
                  <View margin="xx-small 0 0 0">
                    <Tag
                      text={I18n.t('Shared')}
                      margin="0"
                      data-testid={`text-clip-shared-badge-${clip.id}`}
                    />
                  </View>
                )}
                <View margin="xx-small 0 0 0">
                  {clip.source_url && (
                    <Link
                      isWithinText={false}
                      href={sourceUrlWithHighlight(clip) ?? clip.source_url}
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
                    screenReaderLabel={I18n.t('Copy clip')}
                    renderIcon={IconCopyLine}
                    data-testid={`text-clip-copy-${clip.id}`}
                    onClick={() => onCopyClip(clip)}
                    interaction={isDeleting || isPinning || isSharing ? 'disabled' : 'enabled'}
                  />
                  <IconButton
                    size="small"
                    margin="0 x-small 0 0"
                    screenReaderLabel={I18n.t('Copy with citation')}
                    renderIcon={IconCopyLine}
                    data-testid={`text-clip-copy-citation-${clip.id}`}
                    onClick={() => onCopyCitation(clip)}
                    interaction={isDeleting || isPinning || isSharing ? 'disabled' : 'enabled'}
                  />
                  <IconButton
                    size="small"
                    margin="0 x-small 0 0"
                    screenReaderLabel={
                      clip.pinned ? I18n.t('Unpin clip') : I18n.t('Pin clip to top')
                    }
                    renderIcon={clip.pinned ? IconPinSolid : IconPinLine}
                    data-testid={`text-clip-pin-${clip.id}`}
                    onClick={() => onTogglePin(clip)}
                    interaction={isDeleting || isPinning || isSharing ? 'disabled' : 'enabled'}
                  />
                  <IconButton
                    elementRef={el => {
                      shareToggleRef.current = el
                    }}
                    size="small"
                    margin="0 x-small 0 0"
                    screenReaderLabel={I18n.t('Share clip')}
                    renderIcon={IconLinkLine}
                    data-testid={`text-clip-share-${clip.id}`}
                    aria-expanded={sharePanelOpen}
                    onClick={onToggleSharePanel}
                    interaction={isDeleting || isPinning || isSharing ? 'disabled' : 'enabled'}
                  />
                  <IconButton
                    size="small"
                    margin="0 x-small 0 0"
                    screenReaderLabel={I18n.t('Edit clip')}
                    renderIcon={IconEditLine}
                    data-testid={`text-clip-edit-${clip.id}`}
                    onClick={() => onStartEdit(clip)}
                    interaction={isDeleting || isPinning ? 'disabled' : 'enabled'}
                  />
                  <IconButton
                    size="small"
                    screenReaderLabel={I18n.t('Delete clip')}
                    renderIcon={IconTrashLine}
                    data-testid={`text-clip-delete-${clip.id}`}
                    onClick={() => onDelete(clip)}
                    interaction={isDeleting || isPinning ? 'disabled' : 'enabled'}
                  />
                </View>
                {sharePanelOpen && (
                  <View
                    elementRef={el => {
                      sharePanelRef.current = el
                    }}
                    margin="x-small 0 0 0"
                    padding="small"
                    borderWidth="small"
                    data-testid={`text-clip-share-panel-${clip.id}`}
                    role="region"
                    aria-label={I18n.t('Share clip link')}
                  >
                    {clip.share ? (
                      <>
                        <TextInput
                          renderLabel={I18n.t('Share link')}
                          value={clip.share.url}
                          readOnly={true}
                          data-testid={`text-clip-share-url-${clip.id}`}
                        />
                        <Flex margin="x-small 0 0 0">
                          <Button
                            size="small"
                            margin="0 x-small 0 0"
                            renderIcon={<IconCopyLine />}
                            data-testid={`text-clip-copy-link-${clip.id}`}
                            onClick={() => onCopyShareLink(clip.share!.url)}
                          >
                            {I18n.t('Copy link')}
                          </Button>
                          <Button
                            size="small"
                            color="danger"
                            data-testid={`text-clip-stop-sharing-${clip.id}`}
                            onClick={onRevokeShare}
                            interaction={isSharing ? 'disabled' : 'enabled'}
                          >
                            {I18n.t('Stop sharing')}
                          </Button>
                        </Flex>
                      </>
                    ) : (
                      <Button
                        size="small"
                        data-testid={`text-clip-create-link-${clip.id}`}
                        onClick={onCreateShare}
                        interaction={isSharing ? 'disabled' : 'enabled'}
                      >
                        {I18n.t('Create link')}
                      </Button>
                    )}
                  </View>
                )}
              </View>
            </Flex>
          </>
        )}
      </View>
    </List.Item>
  )
}

type TextClipsTrayProps = {
  showViewAllLink?: boolean
}

export default function TextClipsTray({showViewAllLink = true}: TextClipsTrayProps) {
  const queryClient = useQueryClient()
  const courseId = window.ENV.COURSE_ID
  const mode: 'course' | 'global' = courseId ? 'course' : 'global'
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number | string>>(new Set())
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number | string>>(new Set())
  const [manageOpen, setManageOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState<ClipTagColor>('blue')
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null)
  const [renamingTagId, setRenamingTagId] = useState<number | string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [sharePanelClipId, setSharePanelClipId] = useState<number | string | null>(null)
  const [sort, setSort] = useState<ClipSort>('recent')
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number | string>>(new Set())
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown')

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
  const selectedTagIdsArray = useMemo(
    () => Array.from(selectedTagIds).sort((a, b) => String(a).localeCompare(String(b))),
    [selectedTagIds],
  )
  const selectedCourseIdsArray = useMemo(
    () => Array.from(selectedCourseIds).sort((a, b) => String(a).localeCompare(String(b))),
    [selectedCourseIds],
  )

  const queryKey =
    mode === 'course'
      ? (['text_clips', 'course', courseId, debouncedSearch, selectedTagIdsArray, sort] as const)
      : ([
          'text_clips',
          'global',
          debouncedSearch,
          selectedTagIdsArray,
          selectedCourseIdsArray,
          sort,
        ] as const)

  const clipTagsQueryKey = ['clip_tags'] as const
  const {data: clipTags = []} = useQuery({
    queryKey: clipTagsQueryKey,
    queryFn: fetchClipTags,
  })

  const initialPageParam =
    mode === 'course'
      ? textClipsIndexPath(courseId as string | number, {
          q: debouncedSearch || undefined,
          tagIds: selectedTagIdsArray.length > 0 ? selectedTagIdsArray : undefined,
          sort,
        })
      : globalTextClipsIndexPath({
          q: debouncedSearch || undefined,
          tagIds: selectedTagIdsArray.length > 0 ? selectedTagIdsArray : undefined,
          courseIds: selectedCourseIdsArray.length > 0 ? selectedCourseIdsArray : undefined,
          sort,
        })

  const {data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage} =
    useInfiniteQuery({
      queryKey,
      queryFn: ({pageParam}) => fetchTextClipsPage(pageParam),
      getNextPageParam: page => page.nextPage ?? undefined,
      initialPageParam,
      enabled: (mode === 'course' ? Boolean(courseId) : true) && !searchTooShort,
    })

  const clips = useMemo(() => data?.pages.flatMap(page => page.json) ?? [], [data?.pages])

  useEffect(() => {
    const clipIds = new Set(clips.map(clip => clip.id))
    setBulkSelectedIds(prev => {
      const next = new Set([...prev].filter(id => clipIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [clips])

  const bulkSelectedClips = useMemo(
    () => clips.filter(clip => bulkSelectedIds.has(clip.id)),
    [clips, bulkSelectedIds],
  )

  const exportTargetClips = bulkSelectedClips.length > 0 ? bulkSelectedClips : clips
  const allVisibleSelected = clips.length > 0 && clips.every(clip => bulkSelectedIds.has(clip.id))

  const courseFilterOptions = useMemo(() => {
    if (mode !== 'global') return []
    const byId = new Map<number | string, string>()
    for (const clip of clips) {
      if (clip.course?.id != null && clip.course.name) {
        byId.set(clip.course.id, clip.course.name)
      }
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({id, name}))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [clips, mode])

  const invalidateClips = () => {
    void queryClient.invalidateQueries({
      queryKey: mode === 'course' ? ['text_clips', 'course', courseId] : ['text_clips', 'global'],
    })
  }

  const invalidateClipTags = () => {
    void queryClient.invalidateQueries({queryKey: clipTagsQueryKey})
  }

  const toggleFilterCourse = useCallback((courseFilterId: number | string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev)
      if (next.has(courseFilterId)) {
        next.delete(courseFilterId)
      } else {
        next.add(courseFilterId)
      }
      return next
    })
  }, [])

  const toggleFilterTag = useCallback((tagId: number | string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const toggleEditTag = useCallback((tagId: number | string) => {
    setEditDraft(prev => {
      if (!prev) return prev
      const ids = new Set(prev.tag_ids)
      if (ids.has(tagId)) {
        ids.delete(tagId)
      } else {
        ids.add(tagId)
      }
      return {...prev, tag_ids: Array.from(ids)}
    })
  }, [])

  const createTagMutation = useMutation({
    mutationFn: () => createClipTag({name: newTagName.trim(), color: newTagColor}),
    onSuccess: () => {
      setNewTagName('')
      invalidateClipTags()
    },
  })

  const updateTagMutation = useMutation({
    mutationFn: ({id, name}: {id: number | string; name: string}) => updateClipTag(id, {name}),
    onSuccess: () => {
      setRenamingTagId(null)
      setRenameDraft('')
      invalidateClipTags()
      invalidateClips()
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: (id: number | string) => deleteClipTag(id),
    onSuccess: (_data, id) => {
      setSelectedTagIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      invalidateClipTags()
      invalidateClips()
    },
  })

  useEffect(() => {
    const onCreated = () => {
      setEditingId(null)
      setEditDraft(null)
      invalidateClips()
    }
    window.addEventListener('text-clips:created', onCreated)
    return () => window.removeEventListener('text-clips:created', onCreated)
  }, [queryClient, mode, courseId])

  const updateMutation = useMutation({
    mutationFn: ({id, body}: {id: number | string; body: TextClipUpdate}) =>
      mode === 'course'
        ? updateTextClip(courseId as string | number, id, body)
        : updateGlobalTextClip(id, body),
    onSuccess: () => {
      setEditingId(null)
      setEditDraft(null)
      invalidateClips()
    },
  })

  const togglePinMutation = useMutation({
    mutationFn: (clip: TextClipRecord) =>
      mode === 'course'
        ? updateTextClip(courseId as string | number, clip.id, {pinned: !clip.pinned})
        : updateGlobalTextClip(clip.id, {pinned: !clip.pinned}),
    onSuccess: () => invalidateClips(),
  })

  const undoMutation = useMutation({
    mutationFn: (id: number | string) =>
      mode === 'course'
        ? undeleteTextClip(courseId as string | number, id)
        : undeleteGlobalTextClip(id),
    onSuccess: () => {
      setPendingUndo(null)
      invalidateClips()
      showFlashAlert({message: I18n.t('Clip restored'), type: 'success'})
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) =>
      mode === 'course'
        ? deleteTextClip(courseId as string | number, id)
        : deleteGlobalTextClip(id),
    onSuccess: (_data, id) => {
      const deleted = clips.find(clip => clip.id === id)
      setPendingUndo({
        id,
        preview: deleted ? clipPreview(deleted.content, 80) : I18n.t('Clip'),
      })
      setEditingId(null)
      setEditDraft(null)
      setSharePanelClipId(null)
      invalidateClips()
      showFlashAlert({message: I18n.t('Clip deleted'), type: 'success'})
    },
  })

  const shareMutation = useMutation({
    mutationFn: (id: number | string) =>
      mode === 'course' ? shareTextClip(courseId as string | number, id) : shareGlobalTextClip(id),
    onSuccess: () => {
      invalidateClips()
      showFlashAlert({message: I18n.t('Share link created'), type: 'success'})
    },
  })

  const unshareMutation = useMutation({
    mutationFn: (id: number | string) =>
      mode === 'course'
        ? unshareTextClip(courseId as string | number, id)
        : unshareGlobalTextClip(id),
    onSuccess: () => {
      invalidateClips()
      showFlashAlert({message: I18n.t('Sharing stopped'), type: 'success'})
    },
  })

  const copyShareLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      showFlashAlert({message: I18n.t('Link copied'), type: 'success'})
    } catch (_e) {
      showFlashAlert({message: I18n.t('Could not copy link'), type: 'error'})
    }
  }, [])

  const copyClip = useCallback(async (clip: TextClipRecord) => {
    try {
      await copyClipContent(clip)
      showFlashAlert({message: I18n.t('Copied to clipboard'), type: 'success'})
    } catch (_e) {
      showFlashAlert({message: I18n.t('Could not copy to clipboard'), type: 'error'})
    }
  }, [])

  const copyCitation = useCallback(async (clip: TextClipRecord) => {
    try {
      await copyPlainText(buildCitation(clip))
      showFlashAlert({message: I18n.t('Citation copied'), type: 'success'})
    } catch (_e) {
      showFlashAlert({message: I18n.t('Could not copy to clipboard'), type: 'error'})
    }
  }, [])

  const startEdit = (clip: TextClipRecord) => {
    setEditingId(clip.id)
    setEditDraft({
      content: clip.content,
      note: clip.note ?? '',
      tag_ids: (clip.tags ?? []).map(t => t.id),
    })
  }

  const toggleBulkSelect = useCallback((clipId: number | string) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(clipId)) {
        next.delete(clipId)
      } else {
        next.add(clipId)
      }
      return next
    })
  }, [])

  const toggleSelectAllVisible = useCallback(() => {
    setBulkSelectedIds(prev => {
      if (clips.every(clip => prev.has(clip.id))) {
        return new Set()
      }
      return new Set(clips.map(clip => clip.id))
    })
  }, [clips])

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: Array<number | string>) => {
      const deleter =
        mode === 'course'
          ? (id: number | string) => deleteTextClip(courseId as string | number, id)
          : deleteGlobalTextClip
      await Promise.all(ids.map(id => deleter(id)))
    },
    onSuccess: (_data, ids) => {
      setBulkSelectedIds(new Set())
      setEditingId(null)
      setEditDraft(null)
      setSharePanelClipId(null)
      invalidateClips()
      showFlashAlert({
        message: I18n.t('Deleted %{count} clips', {count: ids.length}),
        type: 'success',
      })
    },
  })

  const bulkTagMutation = useMutation({
    mutationFn: async ({ids, tagId}: {ids: Array<number | string>; tagId: number | string}) => {
      const updater =
        mode === 'course'
          ? (id: number | string, body: TextClipUpdate) =>
              updateTextClip(courseId as string | number, id, body)
          : updateGlobalTextClip
      await Promise.all(
        ids.map(async id => {
          const clip = clips.find(c => c.id === id)
          if (!clip) return
          const existing = new Set((clip.tags ?? []).map(tag => tag.id))
          existing.add(tagId)
          await updater(id, {tag_ids: Array.from(existing)})
        }),
      )
    },
    onSuccess: () => {
      invalidateClips()
      showFlashAlert({message: I18n.t('Tags applied to selected clips'), type: 'success'})
    },
  })

  const handleExport = useCallback(() => {
    if (exportTargetClips.length === 0) return
    downloadClipsExport(exportTargetClips, exportFormat)
    showFlashAlert({message: I18n.t('Export started'), type: 'success'})
  }, [exportFormat, exportTargetClips])

  const focusClipRow = useCallback((clipId: number | string) => {
    const row = document.querySelector<HTMLElement>(`[data-clip-row="${clipId}"]`)
    row?.focus()
  }, [])

  const handleClipRowKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const next = clips[index + 1]
        if (next) focusClipRow(next.id)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        const prev = clips[index - 1]
        if (prev) focusClipRow(prev.id)
      }
    },
    [clips, focusClipRow],
  )

  return (
    <View as="div" padding="medium" id="text_clips_tray">
      <Flex alignItems="center" gap="small" margin="0 0 small 0">
        <Heading level="h3" as="h2" margin="none">
          {I18n.t('Text clips')}
        </Heading>
        {showViewAllLink && (
          <Link href="/text_clips" data-testid="text-clips-view-all-link">
            {I18n.t('View all clips')}
          </Link>
        )}
      </Flex>
      <hr role="presentation" />

      {mode === 'global' && courseFilterOptions.length > 0 && (
        <View margin="small 0" data-testid="text-clips-course-filter">
          <Flex wrap="no-wrap" alignItems="center">
            <View as="div" maxWidth="100%" overflowX="auto" overflowY="hidden" display="block">
              <Flex wrap="no-wrap" alignItems="center">
                {courseFilterOptions.map(course => (
                  <ClipTagChip
                    key={String(course.id)}
                    tag={{id: course.id, name: course.name, color: 'gray'}}
                    selected={selectedCourseIds.has(course.id)}
                    onClick={() => toggleFilterCourse(course.id)}
                    testId={`text-clips-filter-course-${course.id}`}
                  />
                ))}
              </Flex>
            </View>
            {selectedCourseIds.size > 0 && (
              <Button
                size="small"
                margin="0 0 0 x-small"
                data-testid="text-clips-clear-course-filters"
                onClick={() => setSelectedCourseIds(new Set())}
              >
                {I18n.t('Clear')}
              </Button>
            )}
          </Flex>
        </View>
      )}

      <View margin="small 0">
        <SimpleSelect
          renderLabel={I18n.t('Sort')}
          value={sort}
          onChange={(_e, {value}) => setSort(value as ClipSort)}
          data-testid="text-clip-sort"
        >
          <SimpleSelect.Option id="sort-recent" value="recent">
            {I18n.t('Recent')}
          </SimpleSelect.Option>
          <SimpleSelect.Option id="sort-oldest" value="oldest">
            {I18n.t('Oldest')}
          </SimpleSelect.Option>
          <SimpleSelect.Option id="sort-source" value="source">
            {I18n.t('Source')}
          </SimpleSelect.Option>
        </SimpleSelect>
      </View>

      {clipTags.length > 0 && (
        <View margin="small 0" data-testid="text-clips-tag-filter">
          <Flex wrap="no-wrap" alignItems="center">
            <View as="div" maxWidth="100%" overflowX="auto" overflowY="hidden" display="block">
              <Flex wrap="no-wrap" alignItems="center">
                {clipTags.map(tag => (
                  <ClipTagChip
                    key={String(tag.id)}
                    tag={tag}
                    selected={selectedTagIds.has(tag.id)}
                    onClick={() => toggleFilterTag(tag.id)}
                    testId={`text-clips-filter-tag-${tag.id}`}
                  />
                ))}
              </Flex>
            </View>
            {selectedTagIds.size > 0 && (
              <Button
                size="small"
                margin="0 0 0 x-small"
                data-testid="text-clips-clear-filters"
                onClick={() => setSelectedTagIds(new Set())}
              >
                {I18n.t('Clear')}
              </Button>
            )}
          </Flex>
        </View>
      )}

      <View margin="small 0">
        <Button
          size="small"
          data-testid="text-clips-manage-tags-toggle"
          onClick={() => setManageOpen(open => !open)}
        >
          {manageOpen ? I18n.t('Hide tags') : I18n.t('Manage tags')}
        </Button>
      </View>

      {manageOpen && (
        <View
          as="div"
          margin="small 0"
          padding="small"
          borderWidth="small"
          data-testid="text-clips-manage-tags-panel"
        >
          {clipTags.map(tag => (
            <Flex key={String(tag.id)} alignItems="center" margin="x-small 0">
              <ClipTagChip tag={tag} />
              {renamingTagId === tag.id ? (
                <>
                  <TextInput
                    renderLabel={I18n.t('Rename tag')}
                    display="inline-block"
                    value={renameDraft}
                    onChange={(_e, value) => setRenameDraft(value)}
                    data-testid={`text-clips-rename-input-${tag.id}`}
                  />
                  <Button
                    size="small"
                    margin="0 x-small"
                    data-testid={`text-clips-rename-save-${tag.id}`}
                    onClick={() => updateTagMutation.mutate({id: tag.id, name: renameDraft.trim()})}
                    interaction={updateTagMutation.isPending ? 'disabled' : 'enabled'}
                  >
                    {I18n.t('Save')}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setRenamingTagId(null)
                      setRenameDraft('')
                    }}
                  >
                    {I18n.t('Cancel')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="small"
                    margin="0 x-small"
                    data-testid={`text-clips-rename-tag-${tag.id}`}
                    onClick={() => {
                      setRenamingTagId(tag.id)
                      setRenameDraft(tag.name)
                    }}
                  >
                    {I18n.t('Rename')}
                  </Button>
                  <IconButton
                    size="small"
                    screenReaderLabel={I18n.t('Delete tag')}
                    renderIcon={IconTrashLine}
                    data-testid={`text-clips-delete-tag-${tag.id}`}
                    onClick={() => deleteTagMutation.mutate(tag.id)}
                    interaction={deleteTagMutation.isPending ? 'disabled' : 'enabled'}
                  />
                </>
              )}
            </Flex>
          ))}
          <View margin="small 0 0 0">
            <TextInput
              renderLabel={I18n.t('New tag name')}
              placeholder={I18n.t('New tag')}
              value={newTagName}
              onChange={(_e, value) => setNewTagName(value)}
              data-testid="text-clips-new-tag-name"
            />
          </View>
          <Flex wrap="wrap" margin="x-small 0">
            {CLIP_TAG_PALETTE.map(color => (
              <Button
                key={color}
                size="small"
                margin="0 x-small x-small 0"
                data-testid={`text-clips-new-tag-color-${color}`}
                onClick={() => setNewTagColor(color)}
                color={newTagColor === color ? 'primary' : 'secondary'}
              >
                {color}
              </Button>
            ))}
          </Flex>
          <Button
            size="small"
            margin="x-small 0 0 0"
            data-testid="text-clips-create-tag"
            onClick={() => createTagMutation.mutate()}
            interaction={createTagMutation.isPending || !newTagName.trim() ? 'disabled' : 'enabled'}
          >
            {I18n.t('Create')}
          </Button>
        </View>
      )}

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
          {mode === 'global'
            ? I18n.t('No clips yet — highlight text in any course to save it here.')
            : I18n.t(
                'No clips yet — highlight text on a page in this course and click Clip to save it here.',
              )}
        </Text>
      )}

      {!isLoading && !isError && !searchTooShort && clips.length > 0 && (
        <>
          <View
            margin="small 0"
            data-testid="text-clips-bulk-toolbar"
            role="toolbar"
            aria-label={I18n.t('Bulk clip actions')}
          >
            <Flex wrap="wrap" alignItems="center" gap="x-small">
              <Checkbox
                label={I18n.t('Select all')}
                checked={allVisibleSelected}
                indeterminate={bulkSelectedIds.size > 0 && !allVisibleSelected}
                onChange={toggleSelectAllVisible}
                data-testid="text-clips-select-all"
              />
              {bulkSelectedIds.size > 0 && (
                <Text size="small" data-testid="text-clips-bulk-count">
                  {I18n.t('%{count} selected', {count: bulkSelectedIds.size})}
                </Text>
              )}
              <Button
                size="small"
                color="danger"
                data-testid="text-clips-bulk-delete"
                onClick={() => bulkDeleteMutation.mutate(Array.from(bulkSelectedIds))}
                interaction={
                  bulkSelectedIds.size === 0 || bulkDeleteMutation.isPending
                    ? 'disabled'
                    : 'enabled'
                }
              >
                {I18n.t('Delete selected')}
              </Button>
              <SimpleSelect
                renderLabel={I18n.t('Export format')}
                value={exportFormat}
                onChange={(_e, {value}) => setExportFormat(value as ExportFormat)}
                data-testid="text-clips-export-format"
              >
                <SimpleSelect.Option id="markdown" value="markdown">
                  {I18n.t('Markdown')}
                </SimpleSelect.Option>
                <SimpleSelect.Option id="csv" value="csv">
                  {I18n.t('CSV')}
                </SimpleSelect.Option>
                <SimpleSelect.Option id="json" value="json">
                  {I18n.t('JSON')}
                </SimpleSelect.Option>
              </SimpleSelect>
              <Button
                size="small"
                data-testid="text-clips-export"
                onClick={handleExport}
                interaction={exportTargetClips.length === 0 ? 'disabled' : 'enabled'}
              >
                {bulkSelectedIds.size > 0 ? I18n.t('Export selected') : I18n.t('Export all loaded')}
              </Button>
            </Flex>
            {bulkSelectedIds.size > 0 && clipTags.length > 0 && (
              <Flex wrap="wrap" margin="x-small 0 0 0" data-testid="text-clips-bulk-tags">
                <Text as="span" size="small">
                  {I18n.t('Add tag to selected:')}
                </Text>
                {clipTags.map(tag => (
                  <ClipTagChip
                    key={String(tag.id)}
                    tag={tag}
                    onClick={() =>
                      bulkTagMutation.mutate({
                        ids: Array.from(bulkSelectedIds),
                        tagId: tag.id,
                      })
                    }
                    testId={`text-clips-bulk-tag-${tag.id}`}
                  />
                ))}
              </Flex>
            )}
          </View>
          <List
            isUnstyled
            margin="small 0"
            itemSpacing="small"
            aria-label={I18n.t('Saved text clips')}
          >
            {clips.map((clip, index) => (
              <TextClipListItem
                key={String(clip.id)}
                clip={clip}
                rowIndex={index}
                editingId={editingId}
                editDraft={editDraft}
                allTags={clipTags}
                showCourseLabel={mode === 'global'}
                onStartEdit={startEdit}
                onEditDraftChange={setEditDraft}
                onToggleEditTag={toggleEditTag}
                onCancelEdit={() => {
                  setEditingId(null)
                  setEditDraft(null)
                }}
                onSaveEdit={(id, body) => updateMutation.mutate({id, body})}
                onDelete={clipToDelete => deleteMutation.mutate(clipToDelete.id)}
                onTogglePin={clipToPin => togglePinMutation.mutate(clipToPin)}
                sharePanelOpen={sharePanelClipId === clip.id}
                onToggleSharePanel={() =>
                  setSharePanelClipId(prev => (prev === clip.id ? null : clip.id))
                }
                onCreateShare={() => shareMutation.mutate(clip.id)}
                onRevokeShare={() => unshareMutation.mutate(clip.id)}
                onCopyShareLink={copyShareLink}
                onCopyClip={copyClip}
                onCopyCitation={copyCitation}
                bulkSelected={bulkSelectedIds.has(clip.id)}
                onToggleBulkSelect={() => toggleBulkSelect(clip.id)}
                onRowKeyDown={handleClipRowKeyDown}
                isSaving={updateMutation.isPending}
                isDeleting={deleteMutation.isPending}
                isPinning={togglePinMutation.isPending}
                isSharing={shareMutation.isPending || unshareMutation.isPending}
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
