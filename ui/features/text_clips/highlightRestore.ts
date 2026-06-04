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
import {showFlashAlert} from '@instructure/platform-alerts'
import type {TextClipRecord} from './types'

const I18n = createI18nScope('text_clips')

export const HIGHLIGHT_PARAM = 'text_clip_highlight'
const HIGHLIGHT_NAME = 'text-clip'
const HIGHLIGHT_STYLE_ID = 'text-clip-highlight-style'
const SNIPPET_MAX_LENGTH = 300
const HIGHLIGHT_CLEAR_MS = 4000

const EDITOR_SKIP_SELECTOR =
  '.tox-edit-area, .CodeMirror, .ql-editor, .RceWrapper, [contenteditable="true"], script, style, noscript'

type CharMapEntry = {node: Text; offset: number}

function normalizeNeedle(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function buildHighlightHash(text: string): string {
  const snippet = normalizeNeedle(text).slice(0, SNIPPET_MAX_LENGTH)
  return `#${HIGHLIGHT_PARAM}=${encodeURIComponent(snippet)}`
}

export function parseHighlightTarget(loc: {hash: string}): string | null {
  const raw = loc.hash.replace(/^#/, '')
  if (!raw.startsWith(`${HIGHLIGHT_PARAM}=`)) return null
  try {
    const decoded = decodeURIComponent(raw.slice(HIGHLIGHT_PARAM.length + 1))
    return decoded ? normalizeNeedle(decoded) : null
  } catch (_e) {
    return null
  }
}

export function sourceUrlWithHighlight(
  clip: Pick<TextClipRecord, 'source_url' | 'content'>,
): string | null {
  if (!clip.source_url) return null
  const hash = buildHighlightHash(clip.content)
  try {
    const url = new URL(clip.source_url, window.location.origin)
    url.hash = hash.replace(/^#/, '')
    return url.toString()
  } catch (_e) {
    const base = clip.source_url.split('#')[0]
    return `${base}${hash}`
  }
}

function nodeInsideSkippedEditor(node: Node): boolean {
  const el =
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : (node.parentElement as Element | null)
  if (!el) return true
  return Boolean(el.closest(EDITOR_SKIP_SELECTOR))
}

function buildSearchIndex(root: Node): {haystack: string; map: CharMapEntry[]} {
  const map: CharMapEntry[] = []
  let haystack = ''
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let textNode = walker.nextNode() as Text | null
  while (textNode) {
    if (!nodeInsideSkippedEditor(textNode)) {
      const value = textNode.nodeValue ?? ''
      for (let i = 0; i < value.length; i += 1) {
        const ch = value[i]
        if (/\s/.test(ch)) {
          if (haystack.length > 0 && haystack[haystack.length - 1] !== ' ') {
            haystack += ' '
            map.push({node: textNode, offset: i})
          }
        } else {
          haystack += ch
          map.push({node: textNode, offset: i})
        }
      }
    }
    textNode = walker.nextNode() as Text | null
  }
  return {haystack, map}
}

export function findTextRange(root: Node, needle: string): Range | null {
  const normalizedNeedle = normalizeNeedle(needle)
  if (!normalizedNeedle) return null

  const {haystack, map} = buildSearchIndex(root)
  const startIndex = haystack.indexOf(normalizedNeedle)
  if (startIndex < 0 || map.length === 0) return null

  const endIndex = startIndex + normalizedNeedle.length - 1
  const startEntry = map[startIndex]
  const endEntry = map[endIndex]
  if (!startEntry || !endEntry) return null

  const range = document.createRange()
  range.setStart(startEntry.node, startEntry.offset)
  range.setEnd(endEntry.node, endEntry.offset + 1)
  return range
}

function ensureHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HIGHLIGHT_STYLE_ID
  style.textContent = `::highlight(${HIGHLIGHT_NAME}) { background-color: rgba(255, 214, 0, 0.55); }`
  document.head.appendChild(style)
}

let clearHighlightTimer: number | undefined

function clearActiveHighlight() {
  if (clearHighlightTimer) {
    window.clearTimeout(clearHighlightTimer)
    clearHighlightTimer = undefined
  }
  if (typeof CSS !== 'undefined' && CSS.highlights) {
    CSS.highlights.delete(HIGHLIGHT_NAME)
  }
}

function scrollTargetForRange(range: Range): Element | null {
  let node: Node | null = range.startContainer
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement ?? node.parentNode
  }
  return node instanceof Element ? node : null
}

export function applyHighlight(range: Range): void {
  clearActiveHighlight()

  scrollTargetForRange(range)?.scrollIntoView({behavior: 'smooth', block: 'center'})

  if (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined') {
    ensureHighlightStyle()
    const highlight = new Highlight(range)
    CSS.highlights.set(HIGHLIGHT_NAME, highlight)
    clearHighlightTimer = window.setTimeout(() => clearActiveHighlight(), HIGHLIGHT_CLEAR_MS)
    return
  }

  clearHighlightTimer = window.setTimeout(() => clearActiveHighlight(), HIGHLIGHT_CLEAR_MS)
}

export function restoreHighlightFromLocation(options?: {
  location?: Pick<Location, 'hash'>
  showMissFlash?: boolean
}): boolean {
  const loc = options?.location ?? window.location
  const needle = parseHighlightTarget(loc)
  if (!needle) return false

  const range = findTextRange(document.body, needle)
  if (!range) {
    if (options?.showMissFlash) {
      showFlashAlert({
        type: 'info',
        message: I18n.t("Couldn't find the clipped text on this page"),
      })
    }
    return false
  }

  applyHighlight(range)
  return true
}

export function scheduleHighlightRestore(maxAttempts = 4) {
  if (!parseHighlightTarget(window.location)) return

  let attempt = 0
  const tryRestore = () => {
    if (restoreHighlightFromLocation({location: window.location, showMissFlash: false})) {
      return
    }
    attempt += 1
    if (attempt < maxAttempts) {
      window.setTimeout(tryRestore, 300 * attempt)
    } else {
      restoreHighlightFromLocation({location: window.location, showMissFlash: true})
    }
  }

  tryRestore()
}
