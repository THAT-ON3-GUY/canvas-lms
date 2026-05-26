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

describe TextClip do
  before :once do
    course_factory
    student_in_course
    teacher_in_course
    @student_clip = TextClip.create!(
      user_id: @student.id,
      course_id: @course.id,
      content: "Student clip content",
      root_account_id: @course.root_account_id
    )
    @teacher_clip = TextClip.create!(
      user_id: @teacher.id,
      course_id: @course.id,
      content: "Teacher clip content",
      root_account_id: @course.root_account_id
    )
  end

  it "saves with a valid user_id and content" do
    expect(@student_clip).to be_persisted
    expect(@student_clip.content).to eql "Student clip content"
    expect(@student_clip.workflow_state).to eql "active"
  end

  it "requires user_id" do
    clip = TextClip.new(content: "orphan clip", root_account_id: @course.root_account_id)
    expect(clip).not_to be_valid
    expect(clip.errors[:user_id]).to be_present
  end

  it "rejects content over the maximum length" do
    clip = TextClip.new(
      user_id: @student.id,
      course_id: @course.id,
      content: "x" * 50_001,
      root_account_id: @course.root_account_id
    )
    expect(clip).not_to be_valid
    expect(clip.errors[:content]).to be_present
  end

  it "saves without a course_id" do
    clip = TextClip.create!(
      user_id: @student.id,
      content: "Global-ready clip",
      root_account_id: Account.default.id
    )
    expect(clip.course_id).to be_nil
    expect(clip.workflow_state).to eql "active"
  end

  it "rejects source_title over the maximum length" do
    clip = TextClip.new(
      user_id: @student.id,
      course_id: @course.id,
      content: "clip",
      source_title: "x" * 513,
      root_account_id: @course.root_account_id
    )
    expect(clip).not_to be_valid
    expect(clip.errors[:source_title]).to be_present
  end

  describe ".searchable" do
    before :once do
      @title_clip = TextClip.create!(
        user_id: @student.id,
        course_id: @course.id,
        content: "body text",
        source_title: "Syllabus Week One",
        root_account_id: @course.root_account_id
      )
    end

    it "returns all clips when the query is blank" do
      expect(TextClip.searchable("").order(:id)).to eq [@student_clip, @teacher_clip, @title_clip]
    end

    it "matches content" do
      expect(TextClip.searchable("Teacher clip").order(:id)).to eq [@teacher_clip]
    end

    it "matches source_title" do
      expect(TextClip.searchable("Syllabus").order(:id)).to eq [@title_clip]
    end

    it "matches note" do
      noted = TextClip.create!(
        user_id: @student.id,
        course_id: @course.id,
        content: "plain body",
        note: "Remember this definition",
        root_account_id: @course.root_account_id
      )
      expect(TextClip.searchable("definition").order(:id)).to eq [noted]
    end
  end

  it "rejects note over the maximum length" do
    clip = TextClip.new(
      user_id: @student.id,
      course_id: @course.id,
      content: "clip",
      note: "x" * 10_001,
      root_account_id: @course.root_account_id
    )
    expect(clip).not_to be_valid
    expect(clip.errors[:note]).to be_present
  end

  it "allows nil and empty note" do
    clip = TextClip.new(
      user_id: @student.id,
      course_id: @course.id,
      content: "clip",
      note: "",
      root_account_id: @course.root_account_id
    )
    expect(clip).to be_valid
  end

  describe "soft delete" do
    it "marks workflow_state deleted without removing the record" do
      @teacher_clip.destroy
      @teacher_clip.reload
      expect(@teacher_clip.workflow_state).to eql "deleted"
      expect(TextClip.find(@teacher_clip.id)).to eql @teacher_clip
    end
  end

  describe ".for_user" do
    it "returns only clips for the given user" do
      expect(TextClip.for_user(@student).order(:id)).to eq [@student_clip]
    end
  end

  describe ".for_course" do
    it "returns only clips for the given course" do
      expect(TextClip.for_course(@course).order(:id)).to eq [@student_clip, @teacher_clip]
    end
  end
end
