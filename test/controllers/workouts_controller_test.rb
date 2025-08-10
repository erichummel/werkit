require "test_helper"

class WorkoutsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @workout = workouts(:one)
    @workout2 = workouts(:two)
    data_file = active_storage_attachments(:workout_data_file)
    @workout.data_file.attach(data_file.blob)
    @workout2.data_file.attach(data_file.blob)
    @user = sign_in_as(users(:one))
  end

  test "should get index" do
    get workouts_url
    assert_response :success
  end

  test "should get new" do
    get new_workout_url
    assert_response :success
  end

  test "should create workout" do
    assert_difference("Workout.count") do
      data_file = fixture_file_upload('cycling_workout.json', 'application/octet-stream')
      post workouts_url, params: { workout: { data_file: data_file, user_id: @user.id } }
    end

    workout = Workout.order(id: :desc).first
    assert_redirected_to workout_url(workout)
    assert workout.data_file.attached?
    assert workout.started_at = Time.parse("2024-04-27 17:53:50 UTC")
    assert workout.ended_at = Time.parse("2024-04-27 18:49:36 UTC")
  end

  test "should show workout" do
    get workout_url(@workout)
    assert_response :success
  end

  test "should get edit" do
    get edit_workout_url(@workout)
    assert_response :success
  end

  test "should update workout" do
    patch workout_url(@workout), params: { workout: { notes: "it was hot, i lost 1 lb in sweat" } }
    assert_redirected_to workout_url(@workout)
  end

  test "should destroy workout" do
    assert_difference("Workout.count", -1) do
      delete workout_url(@workout)
    end

    assert_redirected_to workouts_url
  end
end
