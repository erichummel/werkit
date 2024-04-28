class Workout < ApplicationRecord
  has_one_attached :data_file
  belongs_to :user

  def waypoints
    parsed_data["workouts"].first["route"]
  end

  def parsed_data
    @parsed_data ||= JSON.parse(data_file.download)["data"]
  end

  def bounding_box
    [
      [min_latitude, min_longitude],
      [min_latitude, max_longitude],
      [max_latitude, min_longitude],
      [max_latitude, max_longitude]
    ]
  end

  def start
    waypoints.first.values_at("latitude", "longitude")
  end

  def finish
    waypoints.last.values_at("latitude", "longitude")
  end

  def middle_point
    [(max_latitude + min_latitude) / 2, (max_longitude + min_longitude) / 2]
  end

  def max_latitude
    waypoints.map{|waypoint| waypoint["latitude"]}.max
  end

  def min_latitude
    waypoints.map{|waypoint| waypoint["latitude"]}.min
  end

  def max_longitude
    waypoints.map{|waypoint| waypoint["longitude"]}.max
  end

  def min_longitude
    waypoints.map{|waypoint| waypoint["longitude"]}.min
  end
end
