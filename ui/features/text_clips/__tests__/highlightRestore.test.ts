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

import {showFlashAlert} from '@instructure/platform-alerts'
import {
  HIGHLIGHT_PARAM,
  applyHighlight,
  buildHighlightHash,
  findTextRange,
  parseHighlightTarget,
  restoreHighlightFromLocation,
} from '../highlightRestore'

vi.mock('@instructure/platform-alerts', () => ({
  showFlashAlert: vi.fn(),
}))

const showFlashAlertMock = vi.mocked(showFlashAlert)

describe('highlightRestore hash helpers', () => {
  it('round-trips buildHighlightHash and parseHighlightTarget', () => {
    const text = 'Hello   world\nfrom  clip'
    const hash = buildHighlightHash(text)
    expect(hash).toMatch(new RegExp(`^#${HIGHLIGHT_PARAM}=`))
    expect(parseHighlightTarget({hash})).toBe('Hello world from clip')
  })

  it('ignores unrelated hash fragments', () => {
    expect(parseHighlightTarget({hash: '#section-2'})).toBeNull()
    expect(parseHighlightTarget({hash: ''})).toBeNull()
  })
})

describe('findTextRange', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('matches within a single text node', () => {
    document.body.innerHTML = '<p>Find me in the paragraph.</p>'
    const range = findTextRange(document.body, 'Find me')
    expect(range).not.toBeNull()
    expect(range?.toString()).toBe('Find me')
  })

  it('matches across element boundaries with normalized whitespace', () => {
    document.body.innerHTML = '<p>Hello <span>  world</span>!</p>'
    const range = findTextRange(document.body, 'Hello world')
    expect(range).not.toBeNull()
    expect(range?.toString().replace(/\s+/g, ' ').trim()).toBe('Hello world')
  })

  it('returns null when the needle is not present', () => {
    document.body.innerHTML = '<p>Nothing here</p>'
    expect(findTextRange(document.body, 'missing text')).toBeNull()
  })

  it('skips content inside editors', () => {
    document.body.innerHTML =
      '<p>Visible text</p><div class="tox-edit-area"><p>Hidden editor text</p></div>'
    expect(findTextRange(document.body, 'Hidden editor text')).toBeNull()
    expect(findTextRange(document.body, 'Visible text')).not.toBeNull()
  })
})

describe('restoreHighlightFromLocation', () => {
  let scrollIntoView: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = '<p>Target phrase for highlight.</p>'
    showFlashAlertMock.mockReset()
    vi.stubGlobal('location', {hash: buildHighlightHash('Target phrase')})
    scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {})
  })

  afterEach(() => {
    scrollIntoView.mockRestore()
    vi.unstubAllGlobals()
    if (typeof CSS !== 'undefined' && CSS.highlights) {
      CSS.highlights.clear()
    }
  })

  it('scrolls and registers a highlight when text is found', () => {
    const highlights = new Map<string, unknown>()
    class MockHighlight {
      constructor(public ranges: unknown[]) {}
    }
    vi.stubGlobal('Highlight', MockHighlight)
    vi.stubGlobal('CSS', {
      highlights: {
        set: (name: string, value: unknown) => highlights.set(name, value),
        delete: (name: string) => highlights.delete(name),
      },
    })

    const found = restoreHighlightFromLocation()
    expect(found).toBe(true)
    expect(scrollIntoView).toHaveBeenCalled()
    expect(highlights.has('text-clip')).toBe(true)
    expect(showFlashAlertMock).not.toHaveBeenCalled()
  })

  it('shows an info flash when text is not found', () => {
    document.body.innerHTML = '<p>Other content</p>'
    const found = restoreHighlightFromLocation({showMissFlash: true})
    expect(found).toBe(false)
    expect(showFlashAlertMock).toHaveBeenCalledWith(expect.objectContaining({type: 'info'}))
  })
})

describe('applyHighlight', () => {
  it('scrolls when CSS highlights are unavailable', () => {
    document.body.innerHTML = '<p>Scroll target</p>'
    const range = findTextRange(document.body, 'Scroll target')
    expect(range).not.toBeNull()
    const scrollIntoView = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => {})
    vi.stubGlobal('CSS', undefined)

    applyHighlight(range as Range)
    expect(scrollIntoView).toHaveBeenCalled()
    scrollIntoView.mockRestore()
  })
})
