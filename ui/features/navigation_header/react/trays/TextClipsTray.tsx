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
import {Button, IconButton} from '@instructure/ui-buttons'
import {Heading} from '@instructure/ui-heading'
import {IconExternalLinkLine, IconTrashLine} from '@instructure/ui-icons'
import {Link} from '@instructure/ui-link'
import {List} from '@instructure/ui-list'
import {Spinner} from '@instructure/ui-spinner'
import {Text} from '@instructure/ui-text'
import {TextInput} from '@instructure/ui-text-input'
import {View} from '@instructure/ui-view'
import React, {useEffect, useMemo, useState} from 'react'
import {useInfiniteQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {deleteTextClip, fetchTextClipsPage, textClipsIndexPath} from '../../../text_clips/api'
import type {TextClipRecord} from '../../../text_clips/types'

const I18n = createI18nScope('text_clips')
const SEARCH_DEBOUNCE_MS = 250

function clipPreview(content: string, max = 160) {
  const oneLine = content.replace(/\s+/g, ' ').trim()
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

export default function TextClipsTray() {
  const queryClient = useQueryClient()
  const courseId = window.ENV.COURSE_ID
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [searchInput])

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

  useEffect(() => {
    const onCreated = () => {
      void queryClient.invalidateQueries({queryKey: ['text_clips', courseId]})
    }
    window.addEventListener('text-clips:created', onCreated)
    return () => window.removeEventListener('text-clips:created', onCreated)
  }, [queryClient, courseId])

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteTextClip(courseId as string | number, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey})
    },
  })

  return (
    <View as="div" padding="medium" id="text_clips_tray">
      <Heading level="h3" as="h2">
        {I18n.t('Text clips')}
      </Heading>
      <hr role="presentation" />

      <View margin="small 0">
        <TextInput
          renderLabel={I18n.t('Search clips')}
          placeholder={I18n.t('Search by content or page title')}
          value={searchInput}
          onChange={(_e, value) => setSearchInput(value)}
          data-testid="text-clips-search-input"
        />
      </View>

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
              <List.Item key={String(clip.id)}>
                <View display="block">
                  <Text>{clipPreview(clip.content)}</Text>
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
                      screenReaderLabel={I18n.t('Delete clip')}
                      renderIcon={IconTrashLine}
                      data-testid={`text-clip-delete-${clip.id}`}
                      onClick={() => deleteMutation.mutate(clip.id)}
                      interaction={deleteMutation.isPending ? 'disabled' : 'enabled'}
                    />
                  </View>
                </View>
              </List.Item>
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
