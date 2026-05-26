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

import doFetchApi from '@canvas/do-fetch-api-effect'
import type {TextClipCreate, TextClipRecord, TextClipsPage} from './types'

export function textClipsIndexPath(
  courseId: string | number,
  opts?: {q?: string; perPage?: number},
): string {
  const params = new URLSearchParams()
  params.set('per_page', String(opts?.perPage ?? 20))
  if (opts?.q) {
    params.set('q', opts.q)
  }
  return `/api/v1/courses/${courseId}/text_clips?${params.toString()}`
}

export async function fetchTextClipsPage(path: string): Promise<TextClipsPage> {
  const {json, link} = await doFetchApi<TextClipRecord[]>({
    path,
    method: 'GET',
  })
  return {json: json ?? [], nextPage: link?.next?.url ?? null}
}

export async function fetchTextClips(courseId: string | number): Promise<TextClipRecord[]> {
  const page = await fetchTextClipsPage(textClipsIndexPath(courseId))
  return page.json
}

export async function createTextClip(
  courseId: string | number,
  body: TextClipCreate,
): Promise<TextClipRecord> {
  const {json} = await doFetchApi<TextClipRecord>({
    path: `/api/v1/courses/${courseId}/text_clips`,
    method: 'POST',
    body,
  })
  if (!json) {
    throw new Error('createTextClip: empty response')
  }
  return json
}

export async function deleteTextClip(
  courseId: string | number,
  id: string | number,
): Promise<void> {
  await doFetchApi({
    path: `/api/v1/courses/${courseId}/text_clips/${id}`,
    method: 'DELETE',
  })
}
