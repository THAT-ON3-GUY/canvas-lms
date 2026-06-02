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

describe SharedTextClipsController do
  before :once do
    course_with_teacher(active_all: true)
    @course.shard.activate do
      @clip = TextClip.create!(
        user_id: @teacher.id,
        course_id: @course.id,
        content: "Public clip body",
        source_url: "https://example.com/page",
        source_title: "Week 1",
        note: "Private note",
        root_account_id: @course.root_account_id
      )
      @share = TextClipShare.create!(text_clip: @clip, user: @teacher)
    end
  end

  describe "GET #show" do
    it "returns public clip fields for an anonymous viewer" do
      get :show, params: { token: @share.token }, format: :json
      expect(response).to be_successful
      body = json_parse(response.body)
      expect(body["content"]).to eql "Public clip body"
      expect(body["source_url"]).to eql "https://example.com/page"
      expect(body["source_title"]).to eql "Week 1"
      expect(body["course"]).to eq({ "name" => @course.name })
      expect(body).not_to have_key("note")
      expect(body).not_to have_key("tags")
      expect(body).not_to have_key("user_id")
    end

    it "returns 404 for an invalid token" do
      get :show, params: { token: "invalid-token" }, format: :json
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 after the share is revoked" do
      @share.destroy
      get :show, params: { token: @share.token }, format: :json
      expect(response).to have_http_status(:not_found)
    end
  end
end
