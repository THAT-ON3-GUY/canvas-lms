# frozen_string_literal: true

#
# Copyright (C) 2026 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#
class TextClipTagging < ApplicationRecord
  extend RootAccountResolver
  include Canvas::SoftDeletable

  belongs_to :text_clip
  belongs_to :clip_tag

  resolves_root_account through: :text_clip

  validates :workflow_state, presence: true
  validates :clip_tag_id, uniqueness: {
    scope: :text_clip_id,
    conditions: -> { active },
    case_sensitive: false
  }
end
