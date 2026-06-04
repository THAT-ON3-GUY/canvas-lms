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

export function selectionInsideEditor(sel: Selection | null): boolean {
  if (!sel || sel.rangeCount === 0) return true
  const node = sel.anchorNode
  if (!node) return true
  const el =
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : (node.parentElement as Element | null)
  if (!el) return true
  return Boolean(
    el.closest('.tox-edit-area, .CodeMirror, .ql-editor, .RceWrapper, [contenteditable="true"]'),
  )
}

export function getSelectedText(sel: Selection | null): string {
  if (!sel || sel.isCollapsed) return ''
  return sel.toString().trim()
}

export function getSelectedHtml(sel: Selection | null): string {
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return ''
  const range = sel.getRangeAt(0).cloneRange()
  const div = document.createElement('div')
  div.appendChild(range.cloneContents())
  return div.innerHTML.trim()
}

export function hasFormattedHtml(html: string): boolean {
  return /<[a-z][\s\S]*>/i.test(html)
}
