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

describe TextClipShare do
  before :once do
    course_factory
    student_in_course
    @clip = TextClip.create!(
      user_id: @student.id,
      course_id: @course.id,
      content: "Shareable clip",
      root_account_id: @course.root_account_id
    )
  end

  it "assigns a unique token on create" do
    share = TextClipShare.create!(text_clip: @clip, user: @student)
    expect(share.token).to be_present
    expect(share.token.length).to be >= 20
    other = TextClipShare.create!(
      text_clip: TextClip.create!(
        user_id: @student.id,
        course_id: @course.id,
        content: "Other clip",
        root_account_id: @course.root_account_id
      ),
      user: @student
    )
    expect(other.token).not_to eql share.token
  end

  it "resolves root_account_id through the text clip" do
    share = TextClipShare.create!(text_clip: @clip, user: @student)
    expect(share.root_account_id).to eq @course.root_account_id
  end

  it "soft-deletes without removing the record" do
    share = TextClipShare.create!(text_clip: @clip, user: @student)
    share.destroy
    share.reload
    expect(share.workflow_state).to eql "deleted"
    expect(TextClipShare.find(share.id)).to eql share
  end

  it "allows only one active share per clip" do
    TextClipShare.create!(text_clip: @clip, user: @student)
    duplicate = TextClipShare.new(text_clip: @clip, user: @student)
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:text_clip_id]).to be_present
  end
end
