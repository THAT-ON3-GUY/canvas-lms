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
class CreateTextClips < ActiveRecord::Migration[8.0]
  tag :predeploy

  def change
    create_table :text_clips do |t|
      t.references :user, null: false, foreign_key: true
      t.references :course, null: true, foreign_key: true
      t.text :content, null: false
      t.string :source_url, limit: 4_096
      t.string :workflow_state, default: "active", null: false, limit: 255
      t.references :root_account, null: false, foreign_key: { to_table: :accounts }, index: false
      t.timestamps

      t.check_constraint "workflow_state IN ('active', 'deleted')", name: "chk_text_clips_workflow_state_enum"

      t.index %i[user_id course_id],
              name: "index_text_clips_on_user_id_and_course_id",
              where: "workflow_state = 'active'"

      t.replica_identity_index
    end
  end
end
