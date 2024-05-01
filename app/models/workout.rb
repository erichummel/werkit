class Workout < ApplicationRecord
  has_one_attached :data_file
  belongs_to :user

  def base
    parsed_data["workouts"].first
  end

  def route
    base["route"]
  end

  def waypoints
    @waypoints ||= route.map{|data| OpenStruct.new(data)}
  end

  def waypoints_latlng
    waypoints.map{|p| [p.latitude, p.longitude] }
  end

  def average_speed
    waypoints.map(&:speed).sum / waypoints.size
  end

  def max_speed
    waypoints.map(&:speed).max
  end

  def min_speed
    waypoints.map(&:speed).min
  end

  def distance
    # good job copilot but we've got the data already
    # waypoints.each_cons(2).map do |waypoint, next_waypoint|
    #   Geocoder::Calculations.distance_between([waypoint.latitude, waypoint.longitude], [next_waypoint.latitude, next_waypoint.longitude])
    # end.sum
    "#{base["distance"]["qty"].round(2)} #{base["distance"]["units"]}"
  end

  def duration
    base["duration"]
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
    point = waypoints.first
    [point.latitude, point.longitude]
  end

  def finish
    point = waypoints.last
    [point.latitude, point.longitude]
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

  def as_json(options = {})
    super.merge({
      waypoints: waypoints,
      waypoints_latlng: waypoints_latlng,
      bounding_box: bounding_box,
      start: start,
      finish: finish,
      middle_point: middle_point,
      max_latitude: max_latitude,
      min_latitude: min_latitude,
      max_longitude: max_longitude,
      min_longitude: min_longitude,
      average_speed: average_speed,
      max_speed: max_speed,
      min_speed: min_speed,
      distance: distance,
      duration: duration,
    })
  end
end
