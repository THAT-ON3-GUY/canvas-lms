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

function sourceLabelForCitation(clip: Pick<TextClipRecord, 'source_title' | 'source_url'>): string {
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

export function buildCitation(
  clip: Pick<TextClipRecord, 'content' | 'source_title' | 'source_url'>,
): string {
  const body = clip.content.trim()
  if (!clip.source_url) {
    return body
  }
  const label = sourceLabelForCitation(clip)
  return `${body}\n\nSource: ${label} (${clip.source_url})`
}

export async function copyPlainText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('clipboard unavailable')
  }
  await navigator.clipboard.writeText(text)
}

export async function copyClipContent(
  clip: Pick<TextClipRecord, 'content' | 'content_html'>,
): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('clipboard unavailable')
  }

  const plain = clip.content
  const html = clip.content_html?.trim()

  if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], {type: 'text/html'}),
          'text/plain': new Blob([plain], {type: 'text/plain'}),
        }),
      ])
      return
    } catch (_e) {
      // fall through to plain text
    }
  }

  await copyPlainText(plain)
}
