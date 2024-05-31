class AddStartedAtAndEndedAtToWorkouts < ActiveRecord::Migration[7.1]
  def change
    add_column :workouts, :started_at, :datetime
    add_column :workouts, :ended_at, :datetime

    Workout.reset_column_information
    Workout.all.each do |workout|
      workout.update!(started_at: workout.start_time, ended_at: workout.end_time)
    end
  end
end
