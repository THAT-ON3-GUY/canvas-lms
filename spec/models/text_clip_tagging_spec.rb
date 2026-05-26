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

describe TextClipTagging do
  before :once do
    course_with_student(active_all: true)
    @clip = TextClip.create!(
      user_id: @student.id,
      course_id: @course.id,
      content: "Tagged clip",
      root_account_id: @course.root_account_id
    )
    @tag = ClipTag.create!(
      user_id: @student.id,
      name: "Exam",
      color: "orange",
      root_account_id: @course.root_account_id
    )
  end

  def build_tagging(attrs = {})
    TextClipTagging.new({
      text_clip: @clip,
      clip_tag: @tag,
      root_account_id: @course.root_account_id
    }.merge(attrs))
  end

  it "saves a valid tagging" do
    tagging = build_tagging
    expect(tagging.save).to be true
    expect(tagging.root_account_id).to eq @course.root_account_id
  end

  it "rejects duplicate active taggings for the same clip and tag" do
    build_tagging.save!
    duplicate = build_tagging
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:clip_tag_id]).to be_present
  end

  it "allows re-tagging after soft-delete" do
    tagging = build_tagging
    tagging.save!
    tagging.destroy
    replacement = build_tagging
    expect(replacement).to be_valid
  end

  describe "soft delete" do
    it "marks workflow_state deleted without removing the record" do
      tagging = build_tagging
      tagging.save!
      tagging.destroy
      tagging.reload
      expect(tagging.workflow_state).to eql "deleted"
    end
  end
end
