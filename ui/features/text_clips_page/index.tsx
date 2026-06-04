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

import {render} from '@canvas/react'
import ready from '@instructure/ready'
import React from 'react'
import {QueryClientProvider} from '@tanstack/react-query'
import {queryClient} from '@instructure/platform-query'
import TextClipsPage from './TextClipsPage'

ready(() => {
  const mount = document.getElementById('text_clips_page_mount')
  if (!mount) return

  render(
    <QueryClientProvider client={queryClient}>
      <TextClipsPage />
    </QueryClientProvider>,
    mount,
  )
})
