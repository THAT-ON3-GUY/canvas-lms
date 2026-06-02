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

class SharedTextClipsController < ApplicationController
  include Api::V1::TextClip

  skip_before_action :require_user, only: :show

  def show
    share = find_active_share_by_token(params[:token])
    raise ActiveRecord::RecordNotFound unless share

    @clip = on_clip_shard(share.text_clip) do
      TextClip.preload(:course).find(share.text_clip_id)
    end
    respond_to do |format|
      format.html { render :show, layout: false }
      format.json { render json: shared_text_clip_public_json(@clip) }
    end
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { render plain: I18n.t("Not found"), status: :not_found }
      format.json do
        render json: { errors: [{ message: "not found" }] }, status: :not_found
      end
    end
  end

  private

  def find_active_share_by_token(token)
    shards = [@domain_root_account.shard]
    Shard.with_each_shard(shards) do
      share = TextClipShare.active.preload(:text_clip).find_by(token:)
      return share if share
    end
    nil
  end

  def on_clip_shard(clip, &)
    if clip.course_id
      Course.find(clip.course_id).shard.activate(&)
    else
      clip.user.shard.activate(&)
    end
  end
end
