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

import {buildCitation, copyClipContent, copyPlainText} from '../clipCopy'

describe('buildCitation', () => {
  it('includes title and url when both are present', () => {
    expect(
      buildCitation({
        content: 'Important quote',
        source_title: 'Week 1 Page',
        source_url: 'https://example.com/courses/7/pages/week-1',
      }),
    ).toBe('Important quote\n\nSource: Week 1 Page (https://example.com/courses/7/pages/week-1)')
  })

  it('uses url host when source_title is missing', () => {
    expect(
      buildCitation({
        content: 'Quote',
        source_url: 'https://canvas.example.com/courses/1',
      }),
    ).toBe('Quote\n\nSource: canvas.example.com (https://canvas.example.com/courses/1)')
  })

  it('returns content only when there is no source', () => {
    expect(buildCitation({content: '  Solo text  '})).toBe('Solo text')
  })
})

describe('copyPlainText', () => {
  it('writes text via the clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {writeText, write: vi.fn()},
    })

    await copyPlainText('hello')
    expect(writeText).toHaveBeenCalledWith('hello')
    vi.unstubAllGlobals()
  })

  it('throws when clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {...navigator, clipboard: undefined})
    await expect(copyPlainText('x')).rejects.toThrow('clipboard unavailable')
    vi.unstubAllGlobals()
  })
})

describe('copyClipContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('copies plain text for clips without content_html', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {writeText, write: vi.fn()},
    })

    await copyClipContent({content: 'plain only'})
    expect(writeText).toHaveBeenCalledWith('plain only')
  })

  it('uses clipboard.write with html and plain when content_html is set', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal(
      'ClipboardItem',
      class MockClipboardItem {
        constructor(public items: Record<string, Blob>) {}
      },
    )
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {write, writeText},
    })

    await copyClipContent({
      content: 'Bold text',
      content_html: '<p><strong>Bold</strong> text</p>',
    })

    expect(write).toHaveBeenCalled()
    expect(writeText).not.toHaveBeenCalled()
  })

  it('falls back to plain text when rich copy fails', async () => {
    const write = vi.fn().mockRejectedValue(new Error('denied'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal(
      'ClipboardItem',
      class MockClipboardItem {
        constructor(public items: Record<string, Blob>) {}
      },
    )
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {write, writeText},
    })

    await copyClipContent({
      content: 'Bold text',
      content_html: '<p><strong>Bold</strong> text</p>',
    })

    expect(writeText).toHaveBeenCalledWith('Bold text')
  })
})
