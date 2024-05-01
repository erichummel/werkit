require "test_helper"

class WorkoutTest < ActiveSupport::TestCase
  test "parses uploaded data files" do
    workout = workouts(:one)
    workout.data_file.attach(io: File.open(Rails.root.join("test", "fixtures", "files", "cycle_workout.json")), filename: "cycle_workout.json")
    assert_equal(10, workout.waypoints.size)
  end

  test "returns four corners of the route" do
    workout = workouts(:one)
    workout.data_file.attach(io: File.open(Rails.root.join("test", "fixtures", "files", "cycle_workout.json")), filename: "cycle_workout.json")
    assert_equal(4, workout.bounding_box.size)
  end

  test "returns the start and end points of the route" do
    workout = workouts(:one)
    workout.data_file.attach(io: File.open(Rails.root.join("test", "fixtures", "files", "cycle_workout.json")), filename: "cycle_workout.json")

    assert_equal([40.42072301602432, -74.78835592118314], workout.start)
    assert_equal([40.420707164840294, -74.78862562857125], workout.finish)
  end

  test "returns stats for the workout" do
    workout = workouts(:one)
    workout.data_file.attach(io: File.open(Rails.root.join("test", "fixtures", "files", "cycle_workout.json")), filename: "cycle_workout.json")
    assert_equal("9.2 mi", workout.distance)
  end
end
