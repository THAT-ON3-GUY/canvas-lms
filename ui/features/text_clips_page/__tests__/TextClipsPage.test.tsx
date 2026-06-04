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
import React from 'react'
import TextClipsPage from '../TextClipsPage'

vi.mock('../../navigation_header/react/trays/TextClipsTray', () => ({
  default: ({showViewAllLink}: {showViewAllLink?: boolean}) => (
    <div data-testid="text-clips-tray-mock" data-show-view-all={String(showViewAllLink)} />
  ),
}))

describe('TextClipsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the page shell and reuses TextClipsTray without the view-all link', () => {
    render(<TextClipsPage />)
    expect(screen.getByTestId('text-clips-page')).toBeInTheDocument()
    const tray = screen.getByTestId('text-clips-tray-mock')
    expect(tray).toBeInTheDocument()
    expect(tray).toHaveAttribute('data-show-view-all', 'false')
  })
})
