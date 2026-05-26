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

describe ClipTag do
  before :once do
    course_with_student(active_all: true)
  end

  def build_tag(attrs = {})
    ClipTag.new({
      user: @student,
      name: "Important",
      color: "blue",
      root_account_id: @course.root_account_id
    }.merge(attrs))
  end

  it "saves with valid attributes" do
    tag = build_tag
    expect(tag.save).to be true
    expect(tag.workflow_state).to eql "active"
  end

  it "requires name" do
    tag = build_tag(name: "")
    expect(tag).not_to be_valid
    expect(tag.errors[:name]).to be_present
  end

  it "rejects names over 64 characters" do
    tag = build_tag(name: "x" * 65)
    expect(tag).not_to be_valid
    expect(tag.errors[:name]).to be_present
  end

  it "rejects colors outside the palette" do
    tag = build_tag(color: "chartreuse")
    expect(tag).not_to be_valid
    expect(tag.errors[:color]).to be_present
  end

  it "enforces per-user name uniqueness case-insensitively among active tags" do
    build_tag.save!
    duplicate = build_tag(name: "important")
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:name]).to be_present
  end

  it "allows the same name after the prior tag is soft-deleted" do
    tag = build_tag
    tag.save!
    tag.destroy
    replacement = build_tag(name: "Important")
    expect(replacement).to be_valid
  end

  describe ".for_user" do
    it "returns only tags for the given user" do
      student_tag = build_tag
      student_tag.save!
      teacher_tag = build_tag(user: @teacher, name: "Teacher tag")
      teacher_tag.save!

      expect(ClipTag.for_user(@student).order(:id)).to eq [student_tag]
    end
  end

  describe "soft delete" do
    it "marks workflow_state deleted without removing the record" do
      tag = build_tag
      tag.save!
      tag.destroy
      tag.reload
      expect(tag.workflow_state).to eql "deleted"
      expect(ClipTag.find(tag.id)).to eql tag
    end
  end
end
