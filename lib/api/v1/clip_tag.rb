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

module Api::V1::ClipTag
  include Api::V1::Json

  API_JSON_OPTS = {
    only: %w[id name color workflow_state created_at updated_at]
  }.freeze

  def clip_tag_json(tag, user, session, opts = {})
    api_json(tag, user, session, opts.merge(API_JSON_OPTS))
  end

  def clip_tags_json(tags, user, session, opts = {})
    tags.map { |t| clip_tag_json(t, user, session, opts) }
  end
end
