json.merge! workout.as_json(include_waypoints: @include_waypoints)
json.url workout_url(workout, format: :json)
