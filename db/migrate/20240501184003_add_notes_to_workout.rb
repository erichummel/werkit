class AddNotesToWorkout < ActiveRecord::Migration[7.1]
  def change
    add_column :workouts, :notes, :text
  end
end
