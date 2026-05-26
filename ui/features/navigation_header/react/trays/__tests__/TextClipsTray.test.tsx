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

import {cleanup, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import TextClipsTray, {sourceLinkLabel} from '../TextClipsTray'
import {MockedQueryProvider} from '@canvas/test-utils/query'
import type {GlobalEnv} from '@canvas/global/env/GlobalEnv.d'
import type {TextClipRecord} from '../../../../text_clips/types'

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

  beforeAll(() => server.listen())
  afterEach(() => {
    server.resetHandlers()
    cleanup()
    window.ENV.COURSE_ID = oldCourseId
  })
  afterAll(() => server.close())

  it('shows empty state when there are no clips', async () => {
    window.ENV.COURSE_ID = '42'
    server.use(http.get('*/api/v1/courses/42/text_clips', () => HttpResponse.json([])))
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
})
