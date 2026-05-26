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

import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import SelectionClipButton from '../components/SelectionClipButton'
import {getSelectedText, selectionInsideEditor} from '../selectionUtils'
import {MockedQueryProvider} from '@canvas/test-utils/query'

describe('text_clips selection helpers', () => {
  it('treats collapsed selection as empty text', () => {
    const sel = {
      isCollapsed: true,
      anchorNode: document.createTextNode('x'),
      rangeCount: 0,
      toString: () => '',
    } as unknown as Selection
    expect(getSelectedText(sel)).toBe('')
  })

  it('selectionInsideEditor is true inside contenteditable', () => {
    const host = document.createElement('div')
    host.setAttribute('contenteditable', 'true')
    const text = document.createTextNode('hello')
    host.appendChild(text)
    document.body.appendChild(host)
    const sel = {
      isCollapsed: false,
      anchorNode: text,
      rangeCount: 1,
      toString: () => 'hello',
    } as unknown as Selection
    expect(selectionInsideEditor(sel)).toBe(true)
    document.body.removeChild(host)
  })

  it('selectionInsideEditor is true inside TinyMCE edit area', () => {
    const tox = document.createElement('div')
    tox.className = 'tox-edit-area'
    const inner = document.createTextNode('x')
    tox.appendChild(inner)
    document.body.appendChild(tox)
    const sel = {
      isCollapsed: false,
      anchorNode: inner,
      rangeCount: 1,
      toString: () => 'x',
    } as unknown as Selection
    expect(selectionInsideEditor(sel)).toBe(true)
    document.body.removeChild(tox)
  })
})

describe('SelectionClipButton', () => {
  afterEach(() => {
    cleanup()
  })

  it('invokes onClip when clicked', async () => {
    const user = userEvent.setup()
    const onClip = jest.fn().mockResolvedValue(undefined)
    render(
      <MockedQueryProvider>
        <SelectionClipButton top={10} left={10} onClip={onClip} />
      </MockedQueryProvider>,
    )
    await user.click(screen.getByTestId('text-clip-selection-button'))
    expect(onClip).toHaveBeenCalled()
  })
})
