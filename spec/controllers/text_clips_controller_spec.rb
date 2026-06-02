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

      it "returns a Link header with rel=next when more clips exist than per_page" do
        3.times do |i|
          create_clip_for(@teacher, @course, "Paged clip #{i}")
        end
        get :index, format: :json, params: { course_id: @course.id, per_page: 2 }
        expect(response).to be_successful
        expect(json_parse(response.body).length).to eq 2
        link = Api.parse_pagination_links(response.headers["Link"]).detect { |p| p[:rel] == "next" }
        expect(link).to be_present
      end

      it "filters clips with q across content and source_title" do
        body_clip = create_clip_for(@teacher, @course, "unique body phrase")
        titled = @course.shard.activate do
          TextClip.create!(
            user_id: @teacher.id,
            course_id: @course.id,
            content: "other",
            source_title: "Module Overview",
            root_account_id: @course.root_account_id
          )
        end
        get :index, format: :json, params: { course_id: @course.id, q: "unique body" }
        expect(json_parse(response.body).pluck("id")).to eq [body_clip.id]

        get :index, format: :json, params: { course_id: @course.id, q: "Module" }
        expect(json_parse(response.body).pluck("id")).to eq [titled.id]
      end

      it "returns 422 when q is too short" do
        get :index, format: :json, params: { course_id: @course.id, q: "a" }
        expect(response).to have_http_status(:unprocessable_content)
      end

      it "filters clips by tag_ids (OR)" do
        tag_a = ClipTag.create!(
          user_id: @teacher.id,
          name: "Filter A",
          color: "blue",
          root_account_id: @course.root_account_id
        )
        tag_b = ClipTag.create!(
          user_id: @teacher.id,
          name: "Filter B",
          color: "green",
          root_account_id: @course.root_account_id
        )
        tagged_a = create_clip_for(@teacher, @course, "Clip with A")
        tagged_b = create_clip_for(@teacher, @course, "Clip with B")
        @course.shard.activate do
          TextClipTagging.create!(text_clip: tagged_a, clip_tag: tag_a, root_account_id: @course.root_account_id)
          TextClipTagging.create!(text_clip: tagged_b, clip_tag: tag_b, root_account_id: @course.root_account_id)
        end

        get :index, format: :json, params: { course_id: @course.id, tag_ids: [tag_a.id] }
        expect(json_parse(response.body).pluck("id")).to eq [tagged_a.id]

        get :index, format: :json, params: { course_id: @course.id, tag_ids: [tag_a.id, tag_b.id] }
        expect(json_parse(response.body).pluck("id")).to contain_exactly(tagged_a.id, tagged_b.id)
      end

      it "serializes tags on each clip" do
        tag = ClipTag.create!(
          user_id: @teacher.id,
          name: "Serialized",
          color: "purple",
          root_account_id: @course.root_account_id
        )
        @course.shard.activate do
          TextClipTagging.create!(
            text_clip: @teacher_clip,
            clip_tag: tag,
            root_account_id: @course.root_account_id
          )
        end
        get :index, format: :json, params: { course_id: @course.id }
        body = json_parse(response.body).find { |c| c["id"] == @teacher_clip.id }
        expect(body["tags"]).to eq [{ "id" => tag.id, "name" => "Serialized", "color" => "purple" }]
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

      it "accepts and stores source_title" do
        post :create, format: :json, params: {
          course_id: @course.id,
          content: "Titled clip",
          source_url: "https://example.com/page",
          source_title: "Assignments Index"
        }
        expect(response).to have_http_status(:created)
        body = json_parse(response.body)
        clip = @course.shard.activate { TextClip.find(body["id"]) }
        expect(clip.source_title).to eql "Assignments Index"
        expect(body["source_title"]).to eql "Assignments Index"
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

    describe "PUT #update" do
      it "updates content and note for the current user's clip" do
        put :update, format: :json, params: {
          course_id: @course.id,
          id: @teacher_clip.id,
          content: "Revised clip",
          note: "Study this for the exam"
        }
        expect(response).to be_successful
        body = json_parse(response.body)
        clip = @course.shard.activate { @teacher_clip.reload }
        expect(clip.content).to eql "Revised clip"
        expect(clip.note).to eql "Study this for the exam"
        expect(body["note"]).to eql "Study this for the exam"
      end

      it "returns not found for another user's clip" do
        put :update, format: :json, params: {
          course_id: @course.id,
          id: @student_clip.id,
          content: "Hacked"
        }
        expect(response).to have_http_status(:not_found)
      end

      it "returns bad request when content is blank" do
        put :update, format: :json, params: {
          course_id: @course.id,
          id: @teacher_clip.id,
          content: ""
        }
        expect(response).to have_http_status(:bad_request)
      end

      it "replaces taggings idempotently via tag_ids" do
        tag_a = ClipTag.create!(
          user_id: @teacher.id,
          name: "Tag A",
          color: "blue",
          root_account_id: @course.root_account_id
        )
        tag_b = ClipTag.create!(
          user_id: @teacher.id,
          name: "Tag B",
          color: "green",
          root_account_id: @course.root_account_id
        )
        @course.shard.activate do
          TextClipTagging.create!(
            text_clip: @teacher_clip,
            clip_tag: tag_a,
            root_account_id: @course.root_account_id
          )
        end

        put :update, format: :json, params: {
          course_id: @course.id,
          id: @teacher_clip.id,
          tag_ids: [tag_b.id]
        }
        expect(response).to be_successful
        body = json_parse(response.body)
        expect(body["tags"].pluck("id")).to eq [tag_b.id]
        active_tag_ids = @course.shard.activate do
          @teacher_clip.reload.text_clip_taggings.active.pluck(:clip_tag_id)
        end
        expect(active_tag_ids).to eq [tag_b.id]
      end

      it "removes all taggings when tag_ids is empty" do
        tag = ClipTag.create!(
          user_id: @teacher.id,
          name: "Removable",
          color: "red",
          root_account_id: @course.root_account_id
        )
        @course.shard.activate do
          TextClipTagging.create!(
            text_clip: @teacher_clip,
            clip_tag: tag,
            root_account_id: @course.root_account_id
          )
        end

        put :update, as: :json, params: {
          course_id: @course.id,
          id: @teacher_clip.id,
          tag_ids: []
        }
        expect(response).to be_successful
        expect(json_parse(response.body)["tags"]).to eq []
      end

      it "silently ignores another user's tag ids" do
        other_tag = ClipTag.create!(
          user_id: @student.id,
          name: "Student only",
          color: "gray",
          root_account_id: @course.root_account_id
        )
        own_tag = ClipTag.create!(
          user_id: @teacher.id,
          name: "Teacher own",
          color: "yellow",
          root_account_id: @course.root_account_id
        )

        put :update, format: :json, params: {
          course_id: @course.id,
          id: @teacher_clip.id,
          tag_ids: [other_tag.id, own_tag.id]
        }
        expect(response).to be_successful
        expect(json_parse(response.body)["tags"].pluck("id")).to eq [own_tag.id]
      end

      it "does not partially update taggings when content validation fails" do
        tag = ClipTag.create!(
          user_id: @teacher.id,
          name: "Stays",
          color: "pink",
          root_account_id: @course.root_account_id
        )
        @course.shard.activate do
          TextClipTagging.create!(
            text_clip: @teacher_clip,
            clip_tag: tag,
            root_account_id: @course.root_account_id
          )
        end

        put :update, format: :json, params: {
          course_id: @course.id,
          id: @teacher_clip.id,
          content: "",
          tag_ids: []
        }
        expect(response).to have_http_status(:bad_request)
        active_count = @course.shard.activate do
          @teacher_clip.reload.text_clip_taggings.active.count
        end
        expect(active_count).to eq 1
      end
    end

    describe "POST #undestroy" do
      it "restores a soft-deleted clip" do
        @course.shard.activate { @teacher_clip.destroy }
        post :undestroy, format: :json, params: { course_id: @course.id, id: @teacher_clip.id }
        expect(response).to be_successful
        expect(@course.shard.activate { @teacher_clip.reload.workflow_state }).to eql "active"
      end

      it "is idempotent for an active clip" do
        post :undestroy, format: :json, params: { course_id: @course.id, id: @teacher_clip.id }
        expect(response).to be_successful
        expect(@course.shard.activate { @teacher_clip.reload.workflow_state }).to eql "active"
      end

      it "returns not found for another user's clip" do
        post :undestroy, format: :json, params: { course_id: @course.id, id: @student_clip.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  context "authenticated global routes (users/self)" do
    before :once do
      @main_course = @course
      @second_course = course_factory(active_all: true)
      teacher_in_course(course: @second_course, user: @teacher, active_all: true)
    end

    before do
      user_session(@teacher)
      @teacher.update_root_account_ids
      @global_clip = TextClip.create!(
        user: @teacher,
        course: nil,
        content: "Dashboard clip",
        root_account_id: @main_course.root_account_id
      )
      @course_a_clip = create_clip_for(@teacher, @main_course, "Course A clip")
      @course_b_clip = create_clip_for(@teacher, @second_course, "Course B clip")
      @other_user_clip = create_clip_for(@student, @course, "Student only")
    end

    describe "GET #index" do
      it "returns cross-course clips for the current user" do
        get :index, format: :json, params: { user_id: "self" }
        expect(response).to be_successful
        clip_ids = json_parse(response.body).pluck("id")
        expect(clip_ids).to include(@course_a_clip.id, @course_b_clip.id, @global_clip.id)
        expect(clip_ids).not_to include(@other_user_clip.id)
      end

      it "includes a course stub on each clip" do
        get :index, format: :json, params: { user_id: "self" }
        body = json_parse(response.body).find { |c| c["id"] == @course_a_clip.id }
        expect(body["course"]).to eq({ "id" => @main_course.id, "name" => @main_course.name })
        global_body = json_parse(response.body).find { |c| c["id"] == @global_clip.id }
        expect(global_body["course"]).to be_nil
      end

      it "filters by course_ids[] (OR)" do
        get :index, format: :json, params: { user_id: "self", course_ids: [@main_course.id] }
        clip_ids = json_parse(response.body).pluck("id")
        expect(clip_ids).to include(@course_a_clip.id)
        expect(clip_ids).not_to include(@course_b_clip.id)
      end

      it "filters by tag_ids[] and q" do
        tag = ClipTag.create!(
          user_id: @teacher.id,
          name: "Global filter",
          color: "blue",
          root_account_id: @course.root_account_id
        )
        tagged = create_clip_for(@teacher, @second_course, "unique global phrase")
        @second_course.shard.activate do
          TextClipTagging.create!(
            text_clip: tagged,
            clip_tag: tag,
            root_account_id: @second_course.root_account_id
          )
        end

        get :index, format: :json, params: { user_id: "self", tag_ids: [tag.id] }
        expect(json_parse(response.body).pluck("id")).to eq [tagged.id]

        get :index, format: :json, params: { user_id: "self", q: "unique global" }
        expect(json_parse(response.body).pluck("id")).to eq [tagged.id]
      end
    end

    describe "POST #create" do
      it "creates a clip with course_id nil" do
        post :create, format: :json, params: {
          user_id: "self",
          content: "Off-course clip",
          source_url: "https://example.com/dashboard"
        }
        expect(response).to have_http_status(:created)
        body = json_parse(response.body)
        clip = TextClip.find(body["id"])
        expect(clip.user_id).to eq @teacher.id
        expect(clip.course_id).to be_nil
      end
    end

    describe "PUT #update" do
      it "updates a clip from any course" do
        put :update, format: :json, params: {
          user_id: "self",
          id: @course_b_clip.id,
          note: "Cross-course note"
        }
        expect(response).to be_successful
        clip = @second_course.shard.activate { @course_b_clip.reload }
        expect(clip.note).to eql "Cross-course note"
      end

      it "returns not found for another user's clip" do
        put :update, format: :json, params: {
          user_id: "self",
          id: @other_user_clip.id,
          content: "Hacked"
        }
        expect(response).to have_http_status(:not_found)
      end
    end

    describe "DELETE #destroy" do
      it "soft-deletes the current user's clip" do
        delete :destroy, format: :json, params: { user_id: "self", id: @course_a_clip.id }
        expect(response).to be_successful
        expect(@course.shard.activate { @course_a_clip.reload.workflow_state }).to eql "deleted"
      end
    end

    describe "POST #undestroy" do
      it "restores a soft-deleted clip" do
        @course.shard.activate { @course_a_clip.destroy }
        post :undestroy, format: :json, params: { user_id: "self", id: @course_a_clip.id }
        expect(response).to be_successful
        expect(@course.shard.activate { @course_a_clip.reload.workflow_state }).to eql "active"
      end
    end
  end
end
