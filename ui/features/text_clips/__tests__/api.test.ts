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
import {
  createClipTag,
  createGlobalTextClip,
  createTextClip,
  deleteClipTag,
  fetchClipTags,
  globalTextClipsIndexPath,
  shareGlobalTextClip,
  shareTextClip,
  textClipsIndexPath,
  unshareGlobalTextClip,
  unshareTextClip,
  undeleteTextClip,
  updateClipTag,
  updateTextClip,
} from '../api'

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

  it('textClipsIndexPath serializes tag_ids[]', () => {
    const path = textClipsIndexPath('42', {tagIds: [1, 3]})
    expect(path).toContain('tag_ids%5B%5D=1')
    expect(path).toContain('tag_ids%5B%5D=3')
  })

  it('globalTextClipsIndexPath serializes course_ids[], tag_ids[], and q', () => {
    const path = globalTextClipsIndexPath({
      q: 'beta',
      tagIds: [1],
      courseIds: [7, 9],
    })
    expect(path).toContain('/api/v1/users/self/text_clips')
    expect(path).toContain('q=beta')
    expect(path).toContain('tag_ids%5B%5D=1')
    expect(path).toContain('course_ids%5B%5D=7')
    expect(path).toContain('course_ids%5B%5D=9')
  })

  it('shareTextClip POSTs to course share endpoint', async () => {
    doFetchApi.mockResolvedValueOnce({
      json: {token: 'abc', url: 'https://example.com/text_clips/shared/abc'},
      response: new Response(),
      text: '',
    })
    await shareTextClip('42', 9)
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/courses/42/text_clips/9/share',
      method: 'POST',
    })
  })

  it('unshareTextClip DELETEs course share endpoint', async () => {
    await unshareTextClip('42', 9)
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/courses/42/text_clips/9/share',
      method: 'DELETE',
    })
  })

  it('shareGlobalTextClip POSTs to users/self share endpoint', async () => {
    doFetchApi.mockResolvedValueOnce({
      json: {token: 'xyz', url: 'https://example.com/text_clips/shared/xyz'},
      response: new Response(),
      text: '',
    })
    await shareGlobalTextClip(3)
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/users/self/text_clips/3/share',
      method: 'POST',
    })
  })

  it('unshareGlobalTextClip DELETEs users/self share endpoint', async () => {
    await unshareGlobalTextClip(3)
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/users/self/text_clips/3/share',
      method: 'DELETE',
    })
  })

  it('createGlobalTextClip POSTs to users/self/text_clips', async () => {
    await createGlobalTextClip({
      content: 'dashboard selection',
      source_url: 'https://example.com/dashboard',
    })
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/users/self/text_clips',
      method: 'POST',
      body: {
        content: 'dashboard selection',
        source_url: 'https://example.com/dashboard',
      },
    })
  })

  it('updateTextClip PUTs tag_ids', async () => {
    await updateTextClip('42', 9, {tag_ids: [1, 2]})
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/courses/42/text_clips/9',
      method: 'PUT',
      body: {tag_ids: [1, 2]},
    })
  })

  it('fetchClipTags GETs users/self/clip_tags', async () => {
    doFetchApi.mockResolvedValueOnce({
      json: [{id: 1, name: 'Exam', color: 'blue'}],
      response: new Response(),
      text: '',
    })
    await fetchClipTags()
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/users/self/clip_tags',
      method: 'GET',
    })
  })

  it('createClipTag POSTs name and color', async () => {
    await createClipTag({name: 'Exam', color: 'green'})
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/users/self/clip_tags',
      method: 'POST',
      body: {name: 'Exam', color: 'green'},
    })
  })

  it('updateClipTag PUTs partial body', async () => {
    await updateClipTag(5, {name: 'Renamed'})
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/users/self/clip_tags/5',
      method: 'PUT',
      body: {name: 'Renamed'},
    })
  })

  it('deleteClipTag DELETEs by id', async () => {
    await deleteClipTag(5)
    expect(doFetchApi).toHaveBeenCalledWith({
      path: '/api/v1/users/self/clip_tags/5',
      method: 'DELETE',
    })
  })
})
