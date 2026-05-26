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

import type {ClipTagColor} from './types'

export const CLIP_TAG_PALETTE: ClipTagColor[] = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'gray',
  'yellow',
  'pink',
]

export const CLIP_TAG_THEME: Record<
  ClipTagColor,
  {background: string; borderColor: string; color: string}
> = {
  blue: {background: '#E6F4FF', borderColor: '#0374B5', color: '#0374B5'},
  green: {background: '#E8F8E8', borderColor: '#0B874B', color: '#0B874B'},
  orange: {background: '#FFF4E6', borderColor: '#C87B00', color: '#C87B00'},
  purple: {background: '#F3E8FF', borderColor: '#6B3FA0', color: '#6B3FA0'},
  red: {background: '#FFE8E8', borderColor: '#D01A1A', color: '#D01A1A'},
  gray: {background: '#F2F4F4', borderColor: '#6A7883', color: '#6A7883'},
  yellow: {background: '#FFFBE6', borderColor: '#9A7500', color: '#9A7500'},
  pink: {background: '#FFE6F4', borderColor: '#B5006A', color: '#B5006A'},
}
