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

describe TextClipsController do
  before :once do
    course_with_teacher_and_student_enrolled(active_all: true)
    @other_course = course_factory(active_all: true)
  end

  def create_clip_for(user, course, content)
    course.shard.activate do
      TextClip.create!(
        user_id: user.id,
        course_id: course.id,
        content:,
        root_account_id: course.root_account_id
      )
    end
  end

  context "unauthenticated" do
    it "returns unauthorized for index" do
      get :index, format: :json, params: { course_id: @course.id }
      assert_unauthorized
    end

    it "returns unauthorized for create" do
      post :create, format: :json, params: { course_id: @course.id, content: "new clip" }
      assert_unauthorized
    end
  end

  context "authenticated as teacher" do
    before do
      user_session(@teacher)
      @teacher_clip = create_clip_for(@teacher, @course, "Teacher clip")
      @student_clip = create_clip_for(@student, @course, "Student clip")
    end

    describe "GET #index" do
      it "returns only the current user's clips for the course" do
        get :index, format: :json, params: { course_id: @course.id }
        expect(response).to be_successful
        clip_ids = json_parse(response.body).pluck("id")
        expect(clip_ids).to eq [@teacher_clip.id]
        expect(clip_ids).not_to include(@student_clip.id)
      end
    end

    describe "POST #create" do
      it "creates a clip for the current user and course" do
        post :create, format: :json, params: {
          course_id: @course.id,
          content: "New clip content",
          source_url: "https://example.com/page"
        }
        expect(response).to have_http_status(:created)
        body = json_parse(response.body)
        clip = @course.shard.activate { TextClip.find(body["id"]) }
        expect(clip.user_id).to eq @teacher.id
        expect(clip.course_id).to eq @course.id
        expect(clip.content).to eql "New clip content"
      end

      it "returns forbidden when the user cannot read the course" do
        user_session(@student)
        post :create, format: :json, params: { course_id: @other_course.id, content: "blocked clip" }
        expect(response).to have_http_status(:forbidden)
      end
    end

    describe "DELETE #destroy" do
      it "soft-deletes the current user's clip" do
        delete :destroy, format: :json, params: { course_id: @course.id, id: @teacher_clip.id }
        expect(response).to be_successful
        expect(@course.shard.activate { @teacher_clip.reload.workflow_state }).to eql "deleted"
      end

      it "returns not found for another user's clip" do
        delete :destroy, format: :json, params: { course_id: @course.id, id: @student_clip.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
