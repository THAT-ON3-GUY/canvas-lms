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

# @API Clip tags
#
# Personal tags for organizing text clips (per-user, cross-course).
#
class ClipTagsController < ApplicationController
  include Api::V1::ClipTag
  include TextClipsFeature

  before_action :require_user

  def index
    tags = @current_user.clip_tags.active.order(:name)
    paginated = Api.paginate(tags, self, api_v1_user_clip_tags_url("self"))
    render json: clip_tags_json(paginated, @current_user, session)
  end

  def create
    tag = @current_user.clip_tags.build(create_params.merge(root_account_id: @domain_root_account.id))
    if tag.save
      render json: clip_tag_json(tag, @current_user, session), status: :created
    else
      render json: tag.errors, status: :unprocessable_content
    end
  end

  def update
    tag = find_for_current_user(active: true)
    return unless tag.is_a?(ClipTag)

    if tag.update(update_params)
      render json: clip_tag_json(tag, @current_user, session)
    else
      render json: tag.errors, status: :unprocessable_content
    end
  end

  def destroy
    tag = find_for_current_user(active: true)
    return unless tag.is_a?(ClipTag)

    tag.destroy
    render json: clip_tag_json(tag, @current_user, session)
  end

  private

  def find_for_current_user(active:)
    scope = @current_user.clip_tags
    scope = scope.active if active
    scope.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { errors: [{ message: "not found" }] }, status: :not_found
    nil
  end

  def create_params
    params.permit(:name, :color)
  end

  def update_params
    params.permit(:name, :color)
  end
end
