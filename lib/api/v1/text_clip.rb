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

module Api::V1::TextClip
  include Api::V1::Json
  include Api::V1::TextClipShare

  API_JSON_OPTS = {
    only: %w[id content source_url source_title note pinned_at user_id course_id workflow_state created_at updated_at]
  }.freeze

  def text_clip_json(clip, user, session, opts = {})
    json = api_json(clip, user, session, opts.merge(API_JSON_OPTS))
    json["pinned"] = clip.pinned_at.present?
    json["tags"] = clip.clip_tags.map { |t| { "id" => t.id, "name" => t.name, "color" => t.color } }
    json["course"] = clip.course && { "id" => clip.course.id, "name" => clip.course.name }
    share = clip.active_share
    json["share"] = share ? text_clip_share_json(share, host: opts[:host]) : nil
    json
  end

  def shared_text_clip_public_json(clip)
    {
      "content" => clip.content,
      "source_url" => clip.source_url,
      "source_title" => clip.source_title,
      "course" => clip.course && { "name" => clip.course.name },
      "created_at" => clip.created_at
    }
  end

  def text_clips_json(clips, user, session, opts = {})
    clips.map { |c| text_clip_json(c, user, session, opts) }
  end
end
