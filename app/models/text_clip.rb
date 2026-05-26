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
class TextClip < ApplicationRecord
  extend RootAccountResolver
  include Canvas::SoftDeletable

  belongs_to :user
  belongs_to :course, optional: true
  has_many :text_clip_taggings, dependent: :destroy
  has_many :active_text_clip_taggings, -> { active }, class_name: "TextClipTagging"
  has_many :clip_tags, -> { active }, through: :active_text_clip_taggings, source: :clip_tag

  resolves_root_account through: :course

  validates :user_id, presence: true
  validates :content, presence: true, length: { maximum: 50_000 }
  validates :source_url, length: { maximum: 2048 }, allow_nil: true
  validates :source_title, length: { maximum: 512 }, allow_nil: true
  validates :note, length: { maximum: 10_000 }, allow_nil: true
  validates :workflow_state, presence: true

  scope :for_user, ->(user) { where(user:) }
  scope :for_course, ->(course) { where(course:) }
  scope :searchable, lambda { |q|
    next all if q.blank?

    pattern = "%#{sanitize_sql_like(q)}%"
    where("content ILIKE :p OR source_title ILIKE :p OR note ILIKE :p", p: pattern)
  }
  scope :with_any_tag, lambda { |tag_ids|
    next all if Array(tag_ids).compact.blank?

    joins(:text_clip_taggings)
      .where(text_clip_taggings: { clip_tag_id: tag_ids, workflow_state: "active" })
      .distinct
  }
end
