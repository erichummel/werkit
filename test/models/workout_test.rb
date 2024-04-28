require "test_helper"

class WorkoutTest < ActiveSupport::TestCase
  test "parses uploaded data files" do
    workout = workouts(:one)
    workout.data_file.attach(io: File.open(Rails.root.join("test", "fixtures", "files", "cycle_workout.json")), filename: "cycle_workout.json")
    assert_equal(10, workout.waypoints.size)
  end
end
