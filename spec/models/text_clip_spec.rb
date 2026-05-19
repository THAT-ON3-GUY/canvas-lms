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

  it "saves without a course_id" do
    clip = TextClip.create!(
      user_id: @student.id,
      content: "Global-ready clip",
      root_account_id: Account.default.id
    )
    expect(clip.course_id).to be_nil
    expect(clip.workflow_state).to eql "active"
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
