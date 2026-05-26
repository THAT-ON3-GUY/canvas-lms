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
class CreateClipTags < ActiveRecord::Migration[8.0]
  tag :predeploy

  def change
    create_table :clip_tags do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false, limit: 64
      t.string :color, null: false, default: "blue", limit: 32
      t.string :workflow_state, null: false, default: "active", limit: 255
      t.references :root_account, null: false, foreign_key: { to_table: :accounts }, index: false
      t.timestamps

      t.check_constraint "workflow_state IN ('active', 'deleted')", name: "chk_clip_tags_workflow_state_enum"
      t.replica_identity_index
      t.index "user_id, LOWER(name)",
              unique: true,
              where: "workflow_state = 'active'",
              name: "index_clip_tags_on_user_id_lower_name_active"
    end
  end
end
