class Workout < ApplicationRecord
  belongs_to :user
  has_one_attached :data
end
