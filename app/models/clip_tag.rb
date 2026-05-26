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
class ClipTag < ApplicationRecord
  extend RootAccountResolver
  include Canvas::SoftDeletable

  PALETTE = %w[blue green orange purple red gray yellow pink].freeze

  belongs_to :user
  has_many :text_clip_taggings, dependent: :destroy
  has_many :text_clips, through: :text_clip_taggings

  resolves_root_account through: :user

  validates :name, presence: true, length: { maximum: 64 }
  validates :color, inclusion: { in: PALETTE }
  validates :workflow_state, presence: true
  validates :name, uniqueness: { scope: :user_id, conditions: -> { active }, case_sensitive: false }

  scope :for_user, ->(user) { where(user:) }
end
