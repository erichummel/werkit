class Workout < ApplicationRecord
  has_one_attached :data_file
  belongs_to :user
end
