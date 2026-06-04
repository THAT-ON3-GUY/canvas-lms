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

describe ClipTagsController do
  before :once do
    course_with_teacher_and_student_enrolled(active_all: true)
    @course.root_account.enable_feature!(:text_clips)
    @teacher_tag = ClipTag.create!(
      user_id: @teacher.id,
      name: "Teacher tag",
      color: "blue",
      root_account_id: @course.root_account_id
    )
    @student_tag = ClipTag.create!(
      user_id: @student.id,
      name: "Student tag",
      color: "green",
      root_account_id: @course.root_account_id
    )
  end

  context "unauthenticated" do
    it "returns unauthorized for index" do
      get :index, format: :json, params: { user_id: "self" }
      assert_unauthorized
    end
  end

  context "authenticated as teacher" do
    before do
      user_session(@teacher)
    end

    describe "GET #index" do
      it "returns only the current user's tags ordered by name" do
        get :index, format: :json, params: { user_id: "self" }
        expect(response).to be_successful
        body = json_parse(response.body)
        expect(body.pluck("id")).to eq [@teacher_tag.id]
        expect(body.pluck("name")).to eq ["Teacher tag"]
      end
    end

    describe "POST #create" do
      it "creates a tag for the current user" do
        post :create, format: :json, params: { user_id: "self", name: "New tag", color: "orange" }
        expect(response).to have_http_status(:created)
        body = json_parse(response.body)
        tag = ClipTag.find(body["id"])
        expect(tag.user_id).to eq @teacher.id
        expect(tag.name).to eql "New tag"
        expect(tag.color).to eql "orange"
      end

      it "returns 422 on duplicate name" do
        post :create, format: :json, params: { user_id: "self", name: "Teacher tag", color: "red" }
        expect(response).to have_http_status(:unprocessable_content)
      end

      it "returns 422 on invalid color" do
        post :create, format: :json, params: { user_id: "self", name: "Bad color", color: "neon" }
        expect(response).to have_http_status(:unprocessable_content)
      end
    end

    describe "PUT #update" do
      it "renames the current user's tag" do
        put :update, format: :json, params: { user_id: "self", id: @teacher_tag.id, name: "Renamed" }
        expect(response).to be_successful
        expect(@teacher_tag.reload.name).to eql "Renamed"
      end

      it "returns not found for another user's tag" do
        put :update, format: :json, params: { user_id: "self", id: @student_tag.id, name: "Hacked" }
        expect(response).to have_http_status(:not_found)
      end
    end

    describe "DELETE #destroy" do
      it "soft-deletes the current user's tag" do
        delete :destroy, format: :json, params: { user_id: "self", id: @teacher_tag.id }
        expect(response).to be_successful
        expect(@teacher_tag.reload.workflow_state).to eql "deleted"
      end

      it "returns not found for another user's tag" do
        delete :destroy, format: :json, params: { user_id: "self", id: @student_tag.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
