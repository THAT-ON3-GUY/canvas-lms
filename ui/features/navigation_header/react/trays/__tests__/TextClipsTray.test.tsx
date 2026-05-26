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
    expect(screen.getByTestId('text-clip-source-1')).toHaveTextContent('Week 1 Page')
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
})
