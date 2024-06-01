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

    assert_equal([0, 0], workout.start)
    assert_equal([0, -0.0002697073881], workout.finish)
  end

  test "returns stats for the workout" do
    workout = workouts(:one)
    workout.data_file.attach(io: File.open(Rails.root.join("test", "fixtures", "files", "cycle_workout.json")), filename: "cycle_workout.json")
    assert_equal("9.2 mi", workout.distance)
  end

  test "anonymizes a workout" do
    workout = workouts(:one)
    workout.data_file.attach(io: File.open(Rails.root.join("test", "fixtures", "files", "cycle_workout.json")), filename: "cycle_workout.json")
    workout.anonymize!(Workout::OUTBACK_LATITUDE, Workout::OUTBACK_LONGITUDE)

    assert_not_equal([0, 0], workout.start)
    assert_not_equal([0, -0.0002697073881], workout.finish)

    sample_waypoint = workout.waypoints.sample
    assert_operator(
      Workout.haversine_distance([sample_waypoint.latitude, sample_waypoint.longitude], [0, 0]),
      :>,
      1000)
  end

  test "haversine distance" do
    distance = Workout.haversine_distance([0, 0], [1, 1])
    assert_equal(97.71, distance.round(2))
  end
end
