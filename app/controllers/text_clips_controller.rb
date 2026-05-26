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

# @API Text clips
#
# Private text clips for the current user within a course.
#
class TextClipsController < ApplicationController
  include Api::V1::TextClip

  before_action :require_user
  before_action :require_context_and_read_access
  before_action :require_course_context
  before_action :check_limited_access_for_students, only: %i[index create update destroy undestroy]

  # @API List text clips
  #
  # Returns clips for the current user in the course, newest first.
  #
  def index
    q = params[:q].to_s
    if q.present? && !SearchTermHelper.valid_search_term?(q)
      return render json: { errors: [{ message: "search term must be at least 2 characters" }] },
                    status: :unprocessable_content
    end

    clips = @context.shard.activate do
      @current_user.text_clips
                   .active
                   .for_course(@context)
                   .searchable(q)
                   .order(created_at: :desc)
    end
    paginated = Api.paginate(clips, self, api_v1_course_text_clips_url(@context))
    render json: text_clips_json(paginated, @current_user, session)
  end

  # @API Create a text clip
  #
  # @argument content [Required, String]
  # @argument source_url [Optional, String]
  # @argument source_title [Optional, String]
  #
  def create
    attrs = create_params.to_h.symbolize_keys
    clip = nil
    @context.shard.activate do
      clip = @current_user.text_clips.build(
        course: @context,
        content: attrs[:content],
        source_url: attrs[:source_url].presence,
        source_title: attrs[:source_title].presence
      )
      clip.save
    end
    if clip&.persisted?
      render json: text_clip_json(clip, @current_user, session), status: :created
    else
      render json: clip&.errors || {}, status: :bad_request
    end
  end

  # @API Update a text clip
  #
  # @argument content [Optional, String]
  # @argument note [Optional, String]
  #
  def update
    clip = find_clip_for_current_user(active: true)
    return unless clip.is_a?(TextClip)

    updated = @context.shard.activate { clip.update(normalized_update_params) }
    if updated
      render json: text_clip_json(clip, @current_user, session)
    else
      render json: clip.errors, status: :bad_request
    end
  end

  # @API Delete a text clip
  #
  def destroy
    clip = find_clip_for_current_user(active: true)
    return unless clip.is_a?(TextClip)

    if clip.destroy
      render json: text_clip_json(clip, @current_user, session), status: :ok
    else
      render json: clip.errors, status: :bad_request
    end
  end

  # @API Restore a soft-deleted text clip
  #
  def undestroy
    clip = find_clip_for_current_user(active: false)
    return unless clip.is_a?(TextClip)

    if clip.deleted?
      @context.shard.activate { clip.undestroy }
    end
    render json: text_clip_json(clip, @current_user, session)
  end

  private

  def find_clip_for_current_user(active:)
    scope = @current_user.text_clips.for_course(@context)
    scope = scope.active if active
    @context.shard.activate { scope.find(params[:id]) }
  rescue ActiveRecord::RecordNotFound
    render json: { errors: [{ message: "not found" }] }, status: :not_found
    nil
  end

  def create_params
    params.permit(:content, :source_url, :source_title)
  end

  def update_params
    params.permit(:content, :note)
  end

  def normalized_update_params
    attrs = update_params.to_h.symbolize_keys
    attrs[:note] = attrs[:note].presence if attrs.key?(:note)
    attrs
  end
end
