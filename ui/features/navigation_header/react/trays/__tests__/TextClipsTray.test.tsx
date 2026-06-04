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

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import TextClipsTray, {sourceLinkLabel} from '../TextClipsTray'
import {MockedQueryProvider} from '@canvas/test-utils/query'
import type {GlobalEnv} from '@canvas/global/env/GlobalEnv.d'
import type {TextClipRecord} from '../../../../text_clips/types'
import * as exportClips from '../../../../text_clips/exportClips'

vi.mock('@instructure/platform-alerts', () => ({
  showFlashAlert: vi.fn(),
}))

declare const window: Window & {ENV: GlobalEnv}

const server = setupServer()

const baseClip: TextClipRecord = {
  id: 1,
  content: 'alpha',
  user_id: 1,
  course_id: 7,
  workflow_state: 'active',
  created_at: '',
  updated_at: '',
}

describe('sourceLinkLabel', () => {
  it('prefers source_title over URL host', () => {
    expect(
      sourceLinkLabel({
        ...baseClip,
        source_url: 'https://example.com/courses/1/pages/week-1',
        source_title: 'Week 1 Page',
      }),
    ).toBe('Week 1 Page')
  })
})

describe('TextClipsTray', () => {
  const oldCourseId = window.ENV.COURSE_ID

  beforeAll(() => {
    window.ENV.FEATURES = {...window.ENV.FEATURES, text_clips: true}
    server.listen()
    server.use(http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])))
  })
  afterEach(() => {
    server.resetHandlers()
    cleanup()
    window.ENV.COURSE_ID = oldCourseId
  })
  afterAll(() => server.close())

  it('shows empty state when there are no clips', async () => {
    window.ENV.COURSE_ID = '42'
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/courses/42/text_clips', () => HttpResponse.json([])),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText(/No clips yet/i)).toBeInTheDocument()
    })
  })

  it('renders rich HTML when content_html is present', async () => {
    window.ENV.COURSE_ID = '15'
    server.use(
      http.get('*/api/v1/courses/15/text_clips', () =>
        HttpResponse.json([
          {
            ...baseClip,
            content: 'Bold text',
            content_html: '<p><strong>Bold</strong> text</p>',
          },
        ]),
      ),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('text-clip-rich-1')).toBeInTheDocument())
    expect(screen.getByTestId('text-clip-rich-1').innerHTML).toContain('<strong>Bold</strong>')
  })

  it('pins a clip via PUT when the pin button is clicked', async () => {
    window.ENV.COURSE_ID = '7'
    const user = userEvent.setup()
    let pinned = false
    server.use(
      http.get('*/api/v1/courses/7/text_clips', () =>
        HttpResponse.json([
          {
            ...baseClip,
            pinned,
          },
        ]),
      ),
      http.put('*/api/v1/courses/7/text_clips/1', async ({request}) => {
        const body = (await request.json()) as {pinned?: boolean}
        pinned = Boolean(body.pinned)
        return HttpResponse.json({...baseClip, pinned})
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-pin-1'))
    await waitFor(() => expect(screen.getByTestId('text-clip-pinned-1')).toBeInTheDocument())
  })

  it('requests sort=oldest when the sort select changes', async () => {
    window.ENV.COURSE_ID = '13'
    const user = userEvent.setup()
    const requests: string[] = []
    server.use(
      http.get('*/api/v1/courses/13/text_clips', ({request}) => {
        requests.push(request.url)
        return HttpResponse.json([baseClip])
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('text-clip-sort')).toBeInTheDocument())
    global.event = undefined
    await user.click(screen.getByTestId('text-clip-sort'))
    await user.click(await screen.findByText('Oldest'))
    await waitFor(() => expect(requests.some(url => url.includes('sort=oldest'))).toBe(true))
  })

  it('shows a pinned indicator for pinned clips', async () => {
    window.ENV.COURSE_ID = '14'
    server.use(
      http.get('*/api/v1/courses/14/text_clips', () =>
        HttpResponse.json([{...baseClip, pinned: true}]),
      ),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('text-clip-pinned-1')).toBeInTheDocument())
  })

  it('lists clips, shows source link, and deletes on trash click', async () => {
    window.ENV.COURSE_ID = '7'
    const user = userEvent.setup()
    let clips = [
      {
        ...baseClip,
        source_url: 'https://example.com/courses/7/pages/week-1',
        source_title: 'Week 1 Page',
      },
    ]
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/courses/7/text_clips', () => HttpResponse.json(clips)),
      http.delete('*/api/v1/courses/7/text_clips/1', () => {
        clips = []
        return HttpResponse.json({})
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await waitFor(() =>
      expect(screen.getByTestId('text-clip-source-1')).toHaveTextContent('Week 1 Page'),
    )
    const sourceLink = screen.getByTestId('text-clip-source-1').closest('a')
    expect(sourceLink).toHaveAttribute('href', expect.stringMatching(/#text_clip_highlight=alpha/))
    await user.click(screen.getByTestId('text-clip-delete-1'))
    await waitFor(() => expect(screen.getByText(/No clips yet/i)).toBeInTheDocument())
  })

  it('searches clips after debounce', async () => {
    window.ENV.COURSE_ID = '9'
    const user = userEvent.setup()
    const requests: string[] = []
    server.use(
      http.get('*/api/v1/courses/9/text_clips', ({request}) => {
        requests.push(request.url)
        const url = new URL(request.url)
        if (url.searchParams.get('q') === 'beta') {
          return HttpResponse.json([{...baseClip, id: 2, content: 'beta clip'}])
        }
        return HttpResponse.json([baseClip])
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.type(screen.getByTestId('text-clips-search-input'), 'beta')
    await waitFor(() => expect(screen.getByText(/beta clip/)).toBeInTheDocument())
    expect(requests.some(url => url.includes('q=beta'))).toBe(true)
  })

  it('shows an error for a one-character search term', async () => {
    window.ENV.COURSE_ID = '11'
    const user = userEvent.setup()
    server.use(http.get('*/api/v1/courses/11/text_clips', () => HttpResponse.json([baseClip])))
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.type(screen.getByTestId('text-clips-search-input'), 'z')
    await waitFor(() => expect(screen.getByTestId('text-clips-search-error')).toBeInTheDocument())
  })

  it('shows no-results copy when search matches nothing', async () => {
    window.ENV.COURSE_ID = '12'
    const user = userEvent.setup()
    server.use(
      http.get('*/api/v1/courses/12/text_clips', ({request}) => {
        const url = new URL(request.url)
        if (url.searchParams.get('q') === 'missing') {
          return HttpResponse.json([])
        }
        return HttpResponse.json([baseClip])
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.type(screen.getByTestId('text-clips-search-input'), 'missing')
    await waitFor(() => expect(screen.getByTestId('text-clips-no-results')).toBeInTheDocument())
  })

  it('loads the next page when Load more is clicked', async () => {
    window.ENV.COURSE_ID = '8'
    const user = userEvent.setup()
    server.use(
      http.get('*/api/v1/courses/8/text_clips', ({request}) => {
        const url = new URL(request.url)
        if (url.searchParams.get('page') === '2') {
          return HttpResponse.json([{...baseClip, id: 2, content: 'page two clip'}])
        }
        return HttpResponse.json([baseClip], {
          headers: {
            Link: '</api/v1/courses/8/text_clips?page=2&per_page=20>; rel="next"',
          },
        })
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clips-load-more'))
    await waitFor(() => expect(screen.getByText(/page two clip/)).toBeInTheDocument())
  })

  it('renders note preview under content', async () => {
    window.ENV.COURSE_ID = '13'
    server.use(
      http.get('*/api/v1/courses/13/text_clips', () =>
        HttpResponse.json([{...baseClip, note: 'Important reminder'}]),
      ),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('text-clip-note-1')).toHaveTextContent('Important reminder'),
    )
  })

  it('edits a clip and saves via PUT', async () => {
    window.ENV.COURSE_ID = '14'
    const user = userEvent.setup()
    let clips = [{...baseClip, note: 'old note'}]
    server.use(
      http.get('*/api/v1/courses/14/text_clips', () => HttpResponse.json(clips)),
      http.put('*/api/v1/courses/14/text_clips/1', async ({request}) => {
        const body = (await request.json()) as {content: string; note: string}
        clips = [{...baseClip, content: body.content, note: body.note}]
        return HttpResponse.json(clips[0])
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-edit-1'))
    fireEvent.change(screen.getByTestId('text-clip-edit-content-1'), {
      target: {value: 'updated alpha'},
    })
    fireEvent.change(screen.getByTestId('text-clip-edit-note-1'), {
      target: {value: 'revised note'},
    })
    await user.click(screen.getByTestId('text-clip-save-1'))
    await waitFor(() => expect(screen.getByText(/updated alpha/)).toBeInTheDocument())
  })

  it('cancels edit without PATCH', async () => {
    window.ENV.COURSE_ID = '15'
    const user = userEvent.setup()
    let putCalled = false
    server.use(
      http.get('*/api/v1/courses/15/text_clips', () => HttpResponse.json([baseClip])),
      http.put('*/api/v1/courses/15/text_clips/1', () => {
        putCalled = true
        return HttpResponse.json(baseClip)
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-edit-1'))
    await user.type(screen.getByTestId('text-clip-edit-content-1'), ' changed')
    await user.click(screen.getByTestId('text-clip-cancel-1'))
    expect(putCalled).toBe(false)
    expect(screen.getByText(/alpha/)).toBeInTheDocument()
  })

  it('renders tag chips under clip content', async () => {
    window.ENV.COURSE_ID = '20'
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/courses/20/text_clips', () =>
        HttpResponse.json([
          {
            ...baseClip,
            tags: [{id: 10, name: 'Exam', color: 'orange'}],
          },
        ]),
      ),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('text-clip-tag-1-10')).toHaveTextContent('Exam'))
  })

  it('filters clips when a tag chip is clicked', async () => {
    window.ENV.COURSE_ID = '21'
    const user = userEvent.setup()
    const requests: string[] = []
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () =>
        HttpResponse.json([{id: 5, name: 'Exam', color: 'blue', workflow_state: 'active'}]),
      ),
      http.get('*/api/v1/courses/21/text_clips', ({request}) => {
        requests.push(request.url)
        const url = new URL(request.url)
        if (url.searchParams.getAll('tag_ids[]').includes('5')) {
          return HttpResponse.json([{...baseClip, id: 2, content: 'tagged only'}])
        }
        return HttpResponse.json([baseClip])
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('text-clips-filter-tag-5')).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clips-filter-tag-5'))
    await waitFor(() => expect(screen.getByText(/tagged only/)).toBeInTheDocument())
    expect(requests.some(url => url.includes('tag_ids'))).toBe(true)
    await user.click(screen.getByTestId('text-clips-clear-filters'))
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
  })

  it('saves tag_ids from the editor via PUT', async () => {
    window.ENV.COURSE_ID = '22'
    const user = userEvent.setup()
    let putBody: Record<string, unknown> | null = null
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () =>
        HttpResponse.json([
          {
            id: 7,
            name: 'Exam',
            color: 'green',
            workflow_state: 'active',
            created_at: '',
            updated_at: '',
          },
        ]),
      ),
      http.get('*/api/v1/courses/22/text_clips', () => HttpResponse.json([baseClip])),
      http.put('*/api/v1/courses/22/text_clips/1', async ({request}) => {
        putBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...baseClip,
          tag_ids: putBody?.tag_ids,
          tags: [{id: 7, name: 'Exam', color: 'green'}],
        })
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-edit-1'))
    await waitFor(() => expect(screen.getByTestId('text-clip-edit-tag-1-7')).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-edit-tag-1-7'))
    await user.click(screen.getByTestId('text-clip-save-1'))
    await waitFor(() => expect(putBody?.tag_ids).toEqual([7]))
  })

  it('creates and deletes a tag in the manage panel', async () => {
    window.ENV.COURSE_ID = '23'
    const user = userEvent.setup()
    let tags: Array<{id: number; name: string; color: string; workflow_state: string}> = []
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json(tags)),
      http.get('*/api/v1/courses/23/text_clips', () => HttpResponse.json([])),
      http.post('*/api/v1/users/self/clip_tags', async ({request}) => {
        const body = (await request.json()) as {name: string; color: string}
        const tag = {id: 99, name: body.name, color: body.color, workflow_state: 'active'}
        tags = [tag]
        return HttpResponse.json(tag, {status: 201})
      }),
      http.delete('*/api/v1/users/self/clip_tags/99', () => {
        tags = []
        return HttpResponse.json({})
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/No clips yet/i)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clips-manage-tags-toggle'))
    await user.type(screen.getByTestId('text-clips-new-tag-name'), 'New label')
    await user.click(screen.getByTestId('text-clips-create-tag'))
    await waitFor(() => expect(screen.getByTestId('text-clips-filter-tag-99')).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clips-delete-tag-99'))
    await waitFor(() =>
      expect(screen.queryByTestId('text-clips-filter-tag-99')).not.toBeInTheDocument(),
    )
  })

  it('shows undo after delete and restores the clip', async () => {
    window.ENV.COURSE_ID = '16'
    const user = userEvent.setup()
    let clips = [baseClip]
    server.use(
      http.get('*/api/v1/courses/16/text_clips', () => HttpResponse.json(clips)),
      http.delete('*/api/v1/courses/16/text_clips/1', () => {
        clips = []
        return HttpResponse.json({})
      }),
      http.post('*/api/v1/courses/16/text_clips/1/undestroy', () => {
        clips = [baseClip]
        return HttpResponse.json(baseClip)
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-delete-1'))
    await waitFor(() => expect(screen.getByTestId('text-clips-undo-alert')).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clips-undo-button'))
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
  })

  it('in global mode lists clips with course labels and course filter chips', async () => {
    delete window.ENV.COURSE_ID
    const user = userEvent.setup()
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/users/self/text_clips', ({request}) => {
        const url = new URL(request.url)
        if (url.searchParams.getAll('course_ids[]').includes('7')) {
          return HttpResponse.json([{...baseClip, id: 1, course: {id: 7, name: 'Math 101'}}])
        }
        return HttpResponse.json([
          {...baseClip, id: 1, course: {id: 7, name: 'Math 101'}},
          {...baseClip, id: 2, content: 'beta', course: {id: 8, name: 'History 201'}},
        ])
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('text-clip-course-1')).toHaveTextContent('Math 101'),
    )
    expect(screen.getByTestId('text-clips-filter-course-7')).toBeInTheDocument()
    expect(screen.getByText(/beta/)).toBeInTheDocument()
    await user.click(screen.getByTestId('text-clips-filter-course-7'))
    await waitFor(() => expect(screen.queryByText(/beta/)).not.toBeInTheDocument())
  })

  it('in global mode narrows the query when a course chip is selected', async () => {
    delete window.ENV.COURSE_ID
    const user = userEvent.setup()
    const requests: string[] = []
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/users/self/text_clips', ({request}) => {
        requests.push(request.url)
        const url = new URL(request.url)
        if (url.searchParams.getAll('course_ids[]').includes('7')) {
          return HttpResponse.json([{...baseClip, id: 1, course: {id: 7, name: 'Math 101'}}])
        }
        return HttpResponse.json([
          {...baseClip, id: 1, course: {id: 7, name: 'Math 101'}},
          {...baseClip, id: 2, content: 'beta', course: {id: 8, name: 'History 201'}},
        ])
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/beta/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clips-filter-course-7'))
    await waitFor(() => expect(requests.some(url => url.includes('course_ids'))).toBe(true))
  })

  it('in course mode does not render course filter or course labels', async () => {
    window.ENV.COURSE_ID = '7'
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/courses/7/text_clips', () =>
        HttpResponse.json([
          {
            ...baseClip,
            course: {id: 7, name: 'Math 101'},
          },
        ]),
      ),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    expect(screen.queryByTestId('text-clips-course-filter')).not.toBeInTheDocument()
    expect(screen.queryByTestId('text-clip-course-1')).not.toBeInTheDocument()
  })

  it('copies clip content to the clipboard', async () => {
    window.ENV.COURSE_ID = '16'
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const clipboardStub = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText)
    server.use(http.get('*/api/v1/courses/16/text_clips', () => HttpResponse.json([baseClip])))
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-copy-1'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('alpha'))
    clipboardStub.mockRestore()
  })

  it('copies rich clip content via clipboard.write when content_html is set', async () => {
    window.ENV.COURSE_ID = '17'
    const user = userEvent.setup()
    const write = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal(
      'ClipboardItem',
      class MockClipboardItem {
        constructor(public items: Record<string, Blob>) {}
      },
    )
    const writeStub = vi.spyOn(navigator.clipboard, 'write').mockImplementation(write)
    server.use(
      http.get('*/api/v1/courses/17/text_clips', () =>
        HttpResponse.json([
          {
            ...baseClip,
            content: 'Bold text',
            content_html: '<p><strong>Bold</strong> text</p>',
          },
        ]),
      ),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('text-clip-rich-1')).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-copy-1'))
    await waitFor(() => expect(write).toHaveBeenCalled())
    writeStub.mockRestore()
  })

  it('copies clip with citation including source', async () => {
    window.ENV.COURSE_ID = '18'
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const clipboardStub = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText)
    server.use(
      http.get('*/api/v1/courses/18/text_clips', () =>
        HttpResponse.json([
          {
            ...baseClip,
            source_url: 'https://example.com/courses/18/pages/week-1',
            source_title: 'Week 1 Page',
          },
        ]),
      ),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-copy-citation-1'))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'alpha\n\nSource: Week 1 Page (https://example.com/courses/18/pages/week-1)',
      ),
    )
    clipboardStub.mockRestore()
  })

  it('creates a share link and shows copy controls', async () => {
    window.ENV.COURSE_ID = '30'
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const clipboardStub = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText)
    let clips = [{...baseClip, share: null as {token: string; url: string} | null}]
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/courses/30/text_clips', () => HttpResponse.json(clips)),
      http.post('*/api/v1/courses/30/text_clips/1/share', () => {
        clips = [
          {
            ...baseClip,
            share: {
              token: 'secret-token',
              url: 'https://example.com/text_clips/shared/secret-token',
            },
          },
        ]
        return HttpResponse.json(clips[0].share, {status: 200})
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-share-1'))
    await user.click(screen.getByTestId('text-clip-create-link-1'))
    await waitFor(() =>
      expect(screen.getByTestId('text-clip-share-url-1')).toHaveValue(
        'https://example.com/text_clips/shared/secret-token',
      ),
    )
    await user.click(screen.getByTestId('text-clip-copy-link-1'))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://example.com/text_clips/shared/secret-token'),
    )
    clipboardStub.mockRestore()
  })

  it('exports all loaded clips', async () => {
    window.ENV.COURSE_ID = '40'
    const user = userEvent.setup()
    const downloadSpy = vi.spyOn(exportClips, 'downloadClipsExport').mockImplementation(() => {})
    server.use(http.get('*/api/v1/courses/40/text_clips', () => HttpResponse.json([baseClip])))
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clips-export'))
    expect(downloadSpy).toHaveBeenCalledWith([baseClip], 'markdown')
    downloadSpy.mockRestore()
  })

  it('bulk-deletes selected clips', async () => {
    window.ENV.COURSE_ID = '41'
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.get('*/api/v1/courses/41/text_clips', () => HttpResponse.json([baseClip])),
      http.delete('*/api/v1/courses/41/text_clips/1', () => {
        deleted = true
        return new HttpResponse(null, {status: 200})
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByText(/alpha/)).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-select-1'))
    await user.click(screen.getByTestId('text-clips-bulk-delete'))
    await waitFor(() => expect(deleted).toBe(true))
  })

  it('stops sharing and hides the shared badge', async () => {
    window.ENV.COURSE_ID = '31'
    const user = userEvent.setup()
    let clips: TextClipRecord[] = [
      {
        ...baseClip,
        share: {token: 't1', url: 'https://example.com/text_clips/shared/t1'},
      },
    ]
    server.use(
      http.get('*/api/v1/users/self/clip_tags', () => HttpResponse.json([])),
      http.get('*/api/v1/courses/31/text_clips', () => HttpResponse.json(clips)),
      http.delete('*/api/v1/courses/31/text_clips/1/share', () => {
        clips = [{...baseClip, share: null}]
        return HttpResponse.json({revoked: true})
      }),
    )
    render(
      <MockedQueryProvider>
        <TextClipsTray />
      </MockedQueryProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('text-clip-shared-badge-1')).toBeInTheDocument())
    await user.click(screen.getByTestId('text-clip-share-1'))
    await user.click(screen.getByTestId('text-clip-stop-sharing-1'))
    await waitFor(() =>
      expect(screen.queryByTestId('text-clip-shared-badge-1')).not.toBeInTheDocument(),
    )
  })
})
