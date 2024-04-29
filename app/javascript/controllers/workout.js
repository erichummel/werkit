function findWaypoint(latlng, waypoints) {
  var nearestWaypoint = waypoints[0];
  var waypoint = waypoints.find(function(waypoint) {
    mousePoint = L.point(latlng.lat, latlng.lng);
    if (mousePoint.distanceTo(L.point(waypoint.table.latitude, waypoint.table.longitude)) <
        mousePoint.distanceTo(L.point(nearestWaypoint.table.latitude, nearestWaypoint.table.longitude))) {
      nearestWaypoint = waypoint;
    }
    return waypoint.table.latitude == latlng.lat && waypoint.table.longitude == latlng.lng;
  });

  return waypoint || nearestWaypoint;
}

function findOppositeWaypoint(waypoint, waypoints) {
  var nearestOppositeWaypoint = waypoints[0];

  var oppositeWaypoint = waypoints.find(function(searchWaypoint) {
    searchPoint = L.point(searchWaypoint.table.latitude, searchWaypoint.table.longitude);
  });

  if (
    searchPoint.distanceTo(L.point(waypoint.table.latitude, waypoint.table.longitude)) <
      searchPoint.distanceTo(L.point(nearestOppositeWaypoint.table.latitude, nearestOppositeWaypoint.table.longitude))) {
    nearestOppositeWaypoint = searchWaypoint;
  }

}

function initializeMap() {
  var map = L.map('workout-map').setView(<%= workout.middle_point.to_json %>, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  var workoutMarker = L.marker(<%= workout.middle_point.to_json %>).addTo(map);
  var waypoints = <%= workout.waypoints.to_json.html_safe %>;
  var workout = L.polyline(<%= workout.waypoints_latlng %>, {color: '#00ff00'}).addTo(map);
  workoutTooltip = `
    Workout:
    <ul>
      <li>Started: <%= workout.base["start"] %></li>
      <li>Average Speed: ${mph(<%= workout.average_speed %>)}</li>
      <li>Duration: ${minutes(<%= workout.base["duration"] %>)}</li>
    </ul>
  `
  workoutMarker.bindTooltip(workoutTooltip);

  function mph(mps) {
    const mphConversionFactor = 2.23694;
    return mps * mphConversionFactor;
  }
  function feet(meters) {
    const feetConversionFactor = 3.28084;
    return meters * feetConversionFactor;
  }
  function minutes(seconds) {
    const minutesConversionFactor = 60;
    return seconds / minutesConversionFactor;
  }

  workout.on('mouseover', function(event){
    waypoint = findWaypoint(event.latlng, waypoints);

    var waypointToolTip = `
      Waypoint:
      <ul>
        <li>Latitude: ${waypoint.table.latitude}</li>
        <li>Longitude: ${waypoint.table.longitude}</li>
        <li>Altitude: ${feet(waypoint.table.altitude)}</li>
        <li>Speed: ${mph(waypoint.table.speed)}</li>
      </ul>
    `;

    var tooltip = L.tooltip()
      .setLatLng(event.latlng)
      .setContent(waypointToolTip)
      .addTo(map);

    setTimeout(function() {
      map.closeTooltip(tooltip);
    }, 3000);
  });

}