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

import {MockedQueryProvider} from '@canvas/test-utils/query'
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {showFlashAlert} from '@instructure/platform-alerts'
import React from 'react'
const {mockedCreateTextClip, mockedCreateGlobalTextClip} = vi.hoisted(() => ({
  mockedCreateTextClip: vi.fn(),
  mockedCreateGlobalTextClip: vi.fn(),
}))

vi.mock('../api', () => ({
  createTextClip: mockedCreateTextClip,
  createGlobalTextClip: mockedCreateGlobalTextClip,
}))

import TextClipsSelectionRoot from '../components/TextClipsSelectionRoot'

vi.mock('@instructure/platform-alerts', () => ({
  showFlashAlert: vi.fn(),
}))

vi.mock('../components/SelectionClipButton', () => ({
  default: ({onClip}: {onClip: () => void | Promise<void>}) => (
    <button
      type="button"
      data-testid="text-clip-selection-button"
      onClick={() => {
        void Promise.resolve(onClip())
      }}
    >
      Clip
    </button>
  ),
}))

const mockedShowFlashAlert = vi.mocked(showFlashAlert)

function mockRangeRect() {
  return vi.spyOn(Range.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 80,
    height: 16,
    top: 10,
    left: 20,
    bottom: 26,
    right: 100,
    x: 20,
    y: 10,
    toJSON: () => ({}),
  } as DOMRect)
}

function selectTextNode(textNode: Text, length = textNode.length) {
  const range = document.createRange()
  range.setStart(textNode, 0)
  range.setEnd(textNode, length)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  document.dispatchEvent(new Event('mouseup'))
}

describe('TextClipsSelectionRoot', () => {
  const envBackup = {...window.ENV}
  let rangeRectSpy: ReturnType<typeof mockRangeRect>

  beforeEach(() => {
    vi.clearAllMocks()
    mockedCreateTextClip.mockResolvedValue({id: 1, content: 'hello'} as never)
    mockedCreateGlobalTextClip.mockResolvedValue({id: 2, content: 'hello'} as never)
    window.ENV = {...envBackup, COURSE_ID: '42'}
    document.title = 'Test Page Title'
    rangeRectSpy = mockRangeRect()
  })

  afterEach(() => {
    cleanup()
    window.ENV = envBackup
    document.body.innerHTML = ''
    document.getSelection()?.removeAllRanges()
    rangeRectSpy.mockRestore()
  })

  function renderRoot() {
    return render(
      <MockedQueryProvider>
        <TextClipsSelectionRoot />
      </MockedQueryProvider>,
    )
  }

  it('saves a course clip and shows success when COURSE_ID is set', async () => {
    const host = document.createElement('p')
    const text = document.createTextNode('selected passage')
    host.appendChild(text)
    document.body.appendChild(host)

    const created = vi.fn()
    window.addEventListener('text-clips:created', created)

    renderRoot()
    selectTextNode(text)

    const clipButton = await screen.findByTestId('text-clip-selection-button')
    fireEvent.click(clipButton)

    await waitFor(() => {
      expect(mockedCreateTextClip).toHaveBeenCalledWith('42', {
        content: 'selected passage',
        source_url: window.location.href,
        source_title: 'Test Page Title',
      })
    })
    expect(mockedCreateGlobalTextClip).not.toHaveBeenCalled()
    expect(mockedShowFlashAlert).toHaveBeenCalledWith(expect.objectContaining({type: 'success'}))
    expect(created).toHaveBeenCalled()
    expect(screen.queryByTestId('text-clip-selection-button')).not.toBeInTheDocument()

    window.removeEventListener('text-clips:created', created)
  })

  it('saves a global clip when COURSE_ID is absent', async () => {
    window.ENV = {...envBackup}
    delete (window.ENV as {COURSE_ID?: string}).COURSE_ID

    const host = document.createElement('p')
    const text = document.createTextNode('dashboard clip')
    host.appendChild(text)
    document.body.appendChild(host)

    renderRoot()
    selectTextNode(text)

    fireEvent.click(await screen.findByTestId('text-clip-selection-button'))

    await waitFor(() => {
      expect(mockedCreateGlobalTextClip).toHaveBeenCalledWith({
        content: 'dashboard clip',
        source_url: window.location.href,
        source_title: 'Test Page Title',
      })
    })
    expect(mockedCreateTextClip).not.toHaveBeenCalled()
  })

  it('shows an error flash when save fails and keeps the clip button', async () => {
    mockedCreateTextClip.mockRejectedValueOnce(new Error('network'))

    const host = document.createElement('p')
    const text = document.createTextNode('fail clip')
    host.appendChild(text)
    document.body.appendChild(host)

    renderRoot()
    selectTextNode(text)

    fireEvent.click(await screen.findByTestId('text-clip-selection-button'))

    await waitFor(() => {
      expect(mockedShowFlashAlert).toHaveBeenCalledWith(expect.objectContaining({type: 'error'}))
    })
    expect(screen.getByTestId('text-clip-selection-button')).toBeInTheDocument()
    expect(window.getSelection()?.toString()).toBe('fail clip')
  })

  it('does not render the clip button when selection is inside contenteditable', async () => {
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    const text = document.createTextNode('editor text')
    editor.appendChild(text)
    document.body.appendChild(editor)

    renderRoot()
    selectTextNode(text)

    await waitFor(() => {
      expect(screen.queryByTestId('text-clip-selection-button')).not.toBeInTheDocument()
    })
  })

  it('does not render the clip button when selection is inside TinyMCE', async () => {
    const tox = document.createElement('div')
    tox.className = 'tox-edit-area'
    const text = document.createTextNode('tinymce text')
    tox.appendChild(text)
    document.body.appendChild(tox)

    renderRoot()
    selectTextNode(text)

    await waitFor(() => {
      expect(screen.queryByTestId('text-clip-selection-button')).not.toBeInTheDocument()
    })
  })
})
