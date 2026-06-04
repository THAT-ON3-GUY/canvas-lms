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

import type {TextClipRecord} from './types'

export type ExportFormat = 'markdown' | 'csv' | 'json'

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function clipsToMarkdown(clips: TextClipRecord[]): string {
  return clips
    .map(clip => {
      const title = clip.source_title?.trim() || `Clip ${clip.id}`
      const lines = [`## ${title}`, '', clip.content.trim()]
      if (clip.note?.trim()) {
        lines.push('', `> ${clip.note.trim()}`)
      }
      if (clip.tags?.length) {
        lines.push('', `Tags: ${clip.tags.map(tag => tag.name).join(', ')}`)
      }
      if (clip.course?.name) {
        lines.push('', `Course: ${clip.course.name}`)
      }
      if (clip.source_url) {
        lines.push('', `Source: ${clip.source_url}`)
      }
      lines.push('', `Saved: ${clip.created_at}`)
      return lines.join('\n')
    })
    .join('\n\n---\n\n')
}

export function clipsToCsv(clips: TextClipRecord[]): string {
  const header = [
    'id',
    'content',
    'note',
    'source_url',
    'source_title',
    'course',
    'tags',
    'created_at',
  ]
  const rows = clips.map(clip =>
    [
      String(clip.id),
      clip.content,
      clip.note ?? '',
      clip.source_url ?? '',
      clip.source_title ?? '',
      clip.course?.name ?? '',
      (clip.tags ?? []).map(tag => tag.name).join('; '),
      clip.created_at,
    ]
      .map(escapeCsvCell)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

export function clipsToJson(clips: TextClipRecord[]): string {
  return JSON.stringify(clips, null, 2)
}

export function formatClipsForExport(clips: TextClipRecord[], format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return clipsToMarkdown(clips)
    case 'csv':
      return clipsToCsv(clips)
    case 'json':
      return clipsToJson(clips)
  }
}

export function downloadClipsExport(
  clips: TextClipRecord[],
  format: ExportFormat,
  filenameBase = 'text-clips',
): void {
  const content = formatClipsForExport(clips, format)
  const extension = format === 'markdown' ? 'md' : format
  const mimeType =
    format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown'
  const blob = new Blob([content], {type: `${mimeType};charset=utf-8`})
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filenameBase}.${extension}`
  anchor.click()
  URL.revokeObjectURL(url)
}
