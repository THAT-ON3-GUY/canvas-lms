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
class TextClipsController < ApplicationController
  before_action :require_user
  before_action :require_context_and_read_access

  def index
    clips = @context.shard.activate do
      TextClip.active.where(user_id: @current_user.id, course_id: @context.id).order(created_at: :desc)
    end
    render json: clips.map { |clip| text_clip_json(clip) }
  end

  def create
    clip = nil
    @context.shard.activate do
      clip = TextClip.new(
        user_id: @current_user.id,
        course_id: @context.id,
        content: params[:content],
        source_url: params[:source_url],
        root_account_id: @context.root_account_id
      )
      clip.save
    end
    if clip&.persisted?
      render json: text_clip_json(clip), status: :created
    else
      render json: clip&.errors || {}, status: :bad_request
    end
  end

  def destroy
    clip = @context.shard.activate do
      TextClip.active.where(user_id: @current_user.id).find(params[:id])
    end
    clip.destroy
    render json: text_clip_json(clip), status: :ok
  end

  private

  def text_clip_json(clip)
    {
      id: clip.id,
      user_id: clip.user_id,
      course_id: clip.course_id,
      content: clip.content,
      source_url: clip.source_url,
      workflow_state: clip.workflow_state,
      created_at: clip.created_at,
      updated_at: clip.updated_at
    }
  end
end
