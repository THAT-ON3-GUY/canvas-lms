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

import {useScope as createI18nScope} from '@canvas/i18n'
import {IconButton} from '@instructure/ui-buttons'
import {IconBookmarkLine} from '@instructure/ui-icons'
import React from 'react'

const I18n = createI18nScope('text_clips')

export type SelectionClipButtonProps = {
  top: number
  left: number
  disabled?: boolean
  onClip: () => void | Promise<void>
}

export default function SelectionClipButton({
  top,
  left,
  disabled,
  onClip,
}: SelectionClipButtonProps) {
  return (
    <span
      role="group"
      aria-label={I18n.t('Text clip selection')}
      style={{
        position: 'fixed',
        top: `${Math.max(8, top)}px`,
        left: `${Math.max(8, left)}px`,
        zIndex: 10000,
      }}
    >
      <IconButton
        color="primary"
        size="small"
        screenReaderLabel={I18n.t('Save selected text as clip')}
        renderIcon={IconBookmarkLine}
        data-testid="text-clip-selection-button"
        interaction={disabled ? 'disabled' : 'enabled'}
        onClick={() => {
          void onClip()
        }}
      >
        {I18n.t('Clip')}
      </IconButton>
    </span>
  )
}
