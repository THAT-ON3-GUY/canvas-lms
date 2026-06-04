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
import React, {useCallback, useEffect, useState} from 'react'
import {showFlashAlert} from '@instructure/platform-alerts'
import SelectionClipButton from './SelectionClipButton'
import {createGlobalTextClip, createTextClip} from '../api'
import {
  getSelectedHtml,
  getSelectedText,
  hasFormattedHtml,
  selectionInsideEditor,
} from '../selectionUtils'

const I18n = createI18nScope('text_clips')

type ClipUiState = {top: number; left: number; text: string; html: string} | null

export default function TextClipsSelectionRoot() {
  const courseId = window.ENV.COURSE_ID
  const [clipUi, setClipUi] = useState<ClipUiState>(null)

  const refreshSelection = useCallback(() => {
    const sel = document.getSelection()
    const text = getSelectedText(sel)
    if (!text || selectionInsideEditor(sel)) {
      setClipUi(null)
      return
    }
    if (!sel || sel.rangeCount === 0) {
      setClipUi(null)
      return
    }
    const range = sel.getRangeAt(0).cloneRange()
    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) {
      setClipUi(null)
      return
    }
    const html = getSelectedHtml(sel)
    setClipUi({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      text,
      html,
    })
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', refreshSelection)
    document.addEventListener('mouseup', refreshSelection)
    return () => {
      document.removeEventListener('selectionchange', refreshSelection)
      document.removeEventListener('mouseup', refreshSelection)
    }
  }, [refreshSelection])

  if (!clipUi) {
    return null
  }

  return (
    <SelectionClipButton
      top={clipUi.top}
      left={clipUi.left}
      onClip={async () => {
        try {
          const body = {
            content: clipUi.text,
            ...(hasFormattedHtml(clipUi.html) ? {content_html: clipUi.html} : {}),
            source_url: window.location.href,
            source_title: document.title.slice(0, 512),
          }
          if (courseId) {
            await createTextClip(courseId, body)
          } else {
            await createGlobalTextClip(body)
          }
          window.dispatchEvent(new CustomEvent('text-clips:created'))
          showFlashAlert({message: I18n.t('Clip saved'), type: 'success'})
          setClipUi(null)
          document.getSelection()?.removeAllRanges()
        } catch (_e) {
          showFlashAlert({message: I18n.t('Could not save clip'), type: 'error'})
        }
      }}
    />
  )
}
