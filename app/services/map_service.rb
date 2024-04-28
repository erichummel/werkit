class MapService
  def client
    @client ||= OpenStreetMap::Client.new
  end

  def get_waypoint(latitude, longitude)
    client.reverse(lat: latitude, lon: longitude, format: 'json')
  end
end
