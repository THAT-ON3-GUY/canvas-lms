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

import {getSelectedHtml, hasFormattedHtml} from '../selectionUtils'

describe('getSelectedHtml', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.getSelection()?.removeAllRanges()
  })

  it('returns empty string when selection is collapsed', () => {
    const sel = window.getSelection()
    expect(sel).not.toBeNull()
    expect(getSelectedHtml(sel)).toBe('')
  })

  it('returns inner HTML for a range spanning formatted nodes', () => {
    document.body.innerHTML = '<p>Hello <strong>world</strong></p>'
    const strong = document.querySelector('strong')!
    const textNode = strong.firstChild as Text
    const range = document.createRange()
    range.setStart(document.querySelector('p')!.firstChild as Text, 6)
    range.setEnd(textNode, textNode.length)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)

    const html = getSelectedHtml(sel)
    expect(html).toMatch(/<strong>world<\/strong>/)
    expect(hasFormattedHtml(html)).toBe(true)
  })
})
