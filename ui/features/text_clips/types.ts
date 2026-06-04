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

export type ClipTagColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'gray'
  | 'yellow'
  | 'pink'

export type ClipTagRecord = {
  id: number | string
  name: string
  color: ClipTagColor
  workflow_state: string
  created_at: string
  updated_at: string
}

export type TextClipTagStub = {
  id: number | string
  name: string
  color: ClipTagColor
}

export type TextClipShareRecord = {
  token: string
  url: string
}

export type ClipSort = 'recent' | 'oldest' | 'source'

export type TextClipRecord = {
  id: number | string
  content: string
  content_html?: string | null
  source_url?: string | null
  source_title?: string | null
  note?: string | null
  pinned?: boolean
  pinned_at?: string | null
  tags?: TextClipTagStub[]
  share?: TextClipShareRecord | null
  course?: {id: number | string; name: string} | null
  user_id: number
  course_id: number | null
  workflow_state: string
  created_at: string
  updated_at: string
}

export type TextClipCreate = {
  content: string
  content_html?: string
  source_url?: string
  source_title?: string
}

export type TextClipUpdate = {
  content?: string
  content_html?: string
  note?: string
  pinned?: boolean
  tag_ids?: Array<number | string>
}

export type TextClipsPage = {
  json: TextClipRecord[]
  nextPage: string | null
}
