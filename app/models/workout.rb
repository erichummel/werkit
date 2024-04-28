class Workout < ApplicationRecord
  has_one_attached :data_file
  belongs_to :user

  def waypoints
    parsed_data["workouts"].first["route"]
  end

  def parsed_data
    @parsed_data ||= JSON.parse(data_file.download)["data"]
  end
end
