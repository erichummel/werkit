class UpdateStartedAtAndEndedAt < ActiveRecord::Migration[7.1]
  def change
    Workout.all.each do |workout|
      workout.update!(started_at: workout.start_time, ended_at: workout.end_time)
    end
  end
end
