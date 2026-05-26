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

import doFetchApiModule from '@canvas/do-fetch-api-effect'
import {createTextClip, undeleteTextClip, updateTextClip} from '../api'

vi.mock('@canvas/do-fetch-api-effect', () => ({
  __esModule: true,
  default: vi.fn(),
}))

const doFetchApi = vi.mocked(doFetchApiModule)

describe('text_clips api', () => {
  beforeEach(() => {
    doFetchApi.mockReset()
    doFetchApi.mockResolvedValue({
      json: {id: 1, content: 'hello', source_title: 'Course Home', note: 'note'},
      response: new Response(),
      text: '',
    })
  })

  it('createTextClip POSTs source_title with the clip body', async () => {
    await createTextClip('42', {
      content: 'selected text',
      source_url: 'https://example.com/courses/42',
      source_title: 'Course Home',
    })
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/courses/42/text_clips',
      method: 'POST',
      body: {
        content: 'selected text',
        source_url: 'https://example.com/courses/42',
        source_title: 'Course Home',
      },
    })
  })

  it('updateTextClip PUTs content and note', async () => {
    await updateTextClip('42', 9, {content: 'updated', note: 'my note'})
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/courses/42/text_clips/9',
      method: 'PUT',
      body: {content: 'updated', note: 'my note'},
    })
  })

  it('undeleteTextClip POSTs to undestroy', async () => {
    await undeleteTextClip('42', 9)
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/courses/42/text_clips/9/undestroy',
      method: 'POST',
    })
  })
})
