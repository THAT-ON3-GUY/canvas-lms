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

import {
  clipsToCsv,
  clipsToJson,
  clipsToMarkdown,
  downloadClipsExport,
  formatClipsForExport,
} from '../exportClips'
import type {TextClipRecord} from '../types'

const sampleClip: TextClipRecord = {
  id: 1,
  content: 'Hello, "world"',
  note: 'A note',
  source_url: 'https://example.com/page',
  source_title: 'Week 1',
  tags: [{id: 5, name: 'important', color: 'blue'}],
  course: {id: 7, name: 'Biology'},
  user_id: 1,
  course_id: 7,
  workflow_state: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('exportClips', () => {
  it('formats markdown with metadata', () => {
    const md = clipsToMarkdown([sampleClip])
    expect(md).toContain('## Week 1')
    expect(md).toContain('Hello, "world"')
    expect(md).toContain('Tags: important')
    expect(md).toContain('Course: Biology')
  })

  it('escapes csv cells with quotes and commas', () => {
    const csv = clipsToCsv([sampleClip])
    expect(csv.split('\n')[0]).toBe(
      'id,content,note,source_url,source_title,course,tags,created_at',
    )
    expect(csv).toContain('"Hello, ""world"""')
  })

  it('serializes json', () => {
    const json = clipsToJson([sampleClip])
    expect(JSON.parse(json)[0].id).toBe(1)
  })

  it('downloads via a temporary anchor', () => {
    const click = vi.fn()
    const anchor = {href: '', download: '', click} as unknown as HTMLAnchorElement
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    const originalUrl = global.URL
    const createObjectURL = vi.fn(() => 'blob:1')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    try {
      downloadClipsExport([sampleClip], 'csv', 'my-clips')

      expect(formatClipsForExport([sampleClip], 'csv')).toContain('Hello')
      expect(anchor.download).toBe('my-clips.csv')
      expect(click).toHaveBeenCalled()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:1')
    } finally {
      createElement.mockRestore()
      vi.stubGlobal('URL', originalUrl)
    }
  })
})
