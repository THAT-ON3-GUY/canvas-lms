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
# Private text clips for the current user within a course or across all courses.
#
class TextClipsController < ApplicationController
  include Api::V1::TextClip

  before_action :require_user
  before_action :load_clip_context
  before_action :require_context_and_read_access, if: :course_scoped?
  before_action :require_course_context, if: :course_scoped?
  before_action :check_limited_access_for_students,
                only: %i[index create update destroy undestroy share unshare],
                if: :course_scoped?

  # @API List text clips
  #
  # Returns clips for the current user, newest first. Course-scoped routes
  # return clips for that course; user-scoped routes return clips across all
  # courses with optional course_ids[] filtering.
  #
  def index
    q = params[:q].to_s
    if q.present? && !SearchTermHelper.valid_search_term?(q)
      return render json: { errors: [{ message: "search term must be at least 2 characters" }] },
                    status: :unprocessable_content
    end

    tag_ids = Array(params[:tag_ids]).map(&:to_i).reject(&:zero?)
    course_ids = Array(params[:course_ids]).map(&:to_i).reject(&:zero?)

    clips = clip_query_scope do
      base = @current_user.text_clips
                          .active
                          .searchable(q)
                          .with_any_tag(tag_ids)
                          .preload(:clip_tags, :course, :active_text_clip_share)
      if course_scoped?
        base.for_course(@context)
      else
        base.for_courses(course_ids)
      end.ordered(index_sort_param)
    end
    paginated = Api.paginate(clips, self, index_url)
    render json: text_clips_json(paginated, @current_user, session, { host: request.host_with_port })
  end

  # @API Create a text clip
  #
  # @argument content [Required, String]
  # @argument source_url [Optional, String]
  # @argument source_title [Optional, String]
  #
  def create
    attrs = create_params.to_h.symbolize_keys
    clip = clip_query_scope do
      built = @current_user.text_clips.build(
        course: course_scoped? ? @context : nil,
        content: attrs[:content],
        source_url: attrs[:source_url].presence,
        source_title: attrs[:source_title].presence
      )
      built.root_account_id ||= @domain_root_account.id unless course_scoped?
      built.save
      built
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

    permitted = update_params.to_h
    tag_ids = if permitted.key?("tag_ids")
                Array(permitted["tag_ids"]).map(&:to_i).reject(&:zero?)
              end
    attrs = normalized_update_params(permitted.except("tag_ids", "pinned"))
    if permitted.key?("pinned")
      attrs[:pinned_at] = ActiveModel::Type::Boolean.new.cast(permitted["pinned"]) ? Time.now.utc : nil
    end

    ok = on_clip_shard(clip) do
      ActiveRecord::Base.transaction do
        (attrs.empty? || clip.update(attrs)) && sync_clip_taggings(clip, tag_ids)
      end
    end

    if ok
      clip = on_clip_shard(clip) { TextClip.preload(:clip_tags, :course).find(clip.id) }
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

  # @API Create or return a read-only share link for a text clip
  #
  def share
    clip = find_clip_for_current_user(active: true)
    return unless clip.is_a?(TextClip)

    share_record = on_clip_shard(clip) do
      existing = clip.active_share
      next existing if existing

      share = clip.text_clip_shares.build(user: @current_user)
      if share.save
        share
      else
        render json: share.errors, status: :unprocessable_content
        return
      end
    end
    render json: text_clip_share_json(share_record, host: request.host_with_port), status: :ok
  end

  # @API Revoke the read-only share link for a text clip
  #
  def unshare
    clip = find_clip_for_current_user(active: true)
    return unless clip.is_a?(TextClip)

    on_clip_shard(clip) do
      clip.text_clip_shares.active.find_each(&:destroy)
    end
    render json: { revoked: true }, status: :ok
  end

  # @API Restore a soft-deleted text clip
  #
  def undestroy
    clip = find_clip_for_current_user(active: false)
    return unless clip.is_a?(TextClip)

    if clip.deleted?
      on_clip_shard(clip) { clip.undestroy }
      clip = on_clip_shard(clip) { TextClip.preload(:clip_tags, :course).find(clip.id) }
    end
    render json: text_clip_json(clip, @current_user, session)
  end

  private

  def load_clip_context
    @global_scope = params[:user_id].present?
  end

  def course_scoped?
    !@global_scope
  end

  def clip_query_scope(&)
    course_scoped? ? @context.shard.activate(&) : yield
  end

  def index_url
    course_scoped? ? api_v1_course_text_clips_url(@context) : api_v1_user_text_clips_url("self")
  end

  def on_clip_shard(clip, &)
    if course_scoped?
      @context.shard.activate(&)
    elsif clip.course_id
      Course.find(clip.course_id).shard.activate(&)
    else
      @current_user.shard.activate(&)
    end
  end

  def find_clip_for_current_user(active:)
    scope = @current_user.text_clips
    scope = scope.for_course(@context) if course_scoped?
    scope = scope.active if active
    clip_query_scope { scope.find(params[:id]) }
  rescue ActiveRecord::RecordNotFound
    render json: { errors: [{ message: "not found" }] }, status: :not_found
    nil
  end

  def create_params
    params.permit(:content, :source_url, :source_title)
  end

  def update_params
    params.permit(:content, :note, :pinned, tag_ids: [])
  end

  def index_sort_param
    sort = params[:sort].to_s
    %w[recent oldest source].include?(sort) ? sort : "recent"
  end

  def normalized_update_params(permitted = nil)
    attrs = (permitted || update_params.to_h).symbolize_keys
    attrs[:note] = attrs[:note].presence if attrs.key?(:note)
    attrs
  end

  def sync_clip_taggings(clip, requested_tag_ids)
    return true if requested_tag_ids.nil?

    allowed_ids = @current_user.clip_tags.active.where(id: requested_tag_ids).pluck(:id)
    current_active = clip.text_clip_taggings.active

    to_remove = current_active.where.not(clip_tag_id: allowed_ids)
    to_remove.find_each(&:destroy)

    allowed_ids.each do |tag_id|
      existing = clip.text_clip_taggings.where(clip_tag_id: tag_id).first
      if existing
        existing.update!(workflow_state: "active") unless existing.active?
      else
        clip.text_clip_taggings.create!(clip_tag_id: tag_id)
      end
    end
  end
end
