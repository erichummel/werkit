import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  mph(mps) {
    const mphConversionFactor = 2.23694;
    return mps * mphConversionFactor;
  }
  feet(meters) {
    const feetConversionFactor = 3.28084;
    return meters * feetConversionFactor;
  }
  minutes(seconds) {
    const minutesConversionFactor = 60;
    return seconds / minutesConversionFactor;
  }

  timestampForWaypoint(waypoint) {
    return Date.parse(waypoint.table.timestamp);
  }

  closeInSpaceNotTime(waypoint1, waypoint2) {
    const distance = L.point(waypoint1.table.latitude, waypoint1.table.longitude)
                      .distanceTo(L.point(waypoint2.table.latitude, waypoint2.table.longitude));

    return distance < 10 && Math.abs(this.timestampForWaypoint(waypoint1) - this.timestampForWaypoint(waypoint2)) > 30000;
  }

  findWaypoint(latlng, waypoints) { // TODO: I let copilot run wild on this function, it's a mess
    var nearestWaypoint = waypoints[0];
    const exactWaypoint = waypoints.find(function(waypoint) {
      const mousePoint = L.point(latlng.lat, latlng.lng);
      if (mousePoint.distanceTo(L.point(waypoint.table.latitude, waypoint.table.longitude)) <
          mousePoint.distanceTo(L.point(nearestWaypoint.table.latitude, nearestWaypoint.table.longitude))) {
        nearestWaypoint = waypoint;
      }
      return waypoint.table.latitude == latlng.lat && waypoint.table.longitude == latlng.lng;
    });

    return exactWaypoint || nearestWaypoint;
  }

  findOppositeWaypoint(waypoint, waypoints) {
    var nearestOppositeWaypoint = waypoints[0];
    const oppositeWaypoint = waypoints.find((function(searchWaypoint) {
      const searchPoint = L.point(searchWaypoint.table.latitude, searchWaypoint.table.longitude);
      if (searchPoint.distanceTo(L.point(waypoint.table.latitude, waypoint.table.longitude)) <
          searchPoint.distanceTo(L.point(nearestOppositeWaypoint.table.latitude, nearestOppositeWaypoint.table.longitude)) &&
          this.closeInSpaceNotTime(waypoint, searchWaypoint)
        ) {
        nearestOppositeWaypoint = searchWaypoint;
      }
      return waypoint.table.latitude == searchWaypoint.table.latitude &&
        waypoint.table.longitude == searchWaypoint.table.longitude &&
        this.closeInSpaceNotTime(waypoint, searchWaypoint);
    }).bind(this));
    return oppositeWaypoint || nearestOppositeWaypoint;
  }

  waypointTooltipTemplate(waypoint) {
    return `
      Waypoint:
      <ul>
        <li>Timestamp: ${waypoint.table.timestamp}</li>
        <li>Latitude: ${waypoint.table.latitude}</li>
        <li>Longitude: ${waypoint.table.longitude}</li>
        <li>Altitude: ${this.feet(waypoint.table.altitude)}</li>
        <li>Speed: ${this.mph(waypoint.table.speed)}</li>
      </ul>
    `;
  }

  waypointTooltip(event) {
    const waypoint = this.findWaypoint(event.latlng, this.waypoints);
    const oppositeWaypoint = this.findOppositeWaypoint(waypoint, this.waypoints);
    const waypointTooltipContents = this.waypointTooltipTemplate(waypoint) + this.waypointTooltipTemplate(oppositeWaypoint);
    const tooltip = L.tooltip()
      .setLatLng(event.latlng)
      .setContent(waypointTooltipContents)
      .addTo(this.map);

    setTimeout((function() {
      this.map.closeTooltip(tooltip);
    }).bind(this), 3000);
  }

  initializeMap() {
    this.workoutJSON = window.workoutJSON; // TODO there's gotta be a more railsy way pass this json up to the javascript controller
    this.map = L.map('workout-map').setView(this.workoutJSON.middle_point, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
    this.workoutMarker = L.marker(this.workoutJSON.middle_point).addTo(this.map);
    this.waypoints = this.workoutJSON.waypoints;
    this.workoutPolyline = L.polyline(this.workoutJSON.waypoints_latlng, {color: '#00ff00'}).addTo(this.map);
    this.workoutTooltipTemplate = `
      Workout:
      <ul>
        <li>Start: ${this.workoutJSON.start}</li>
        <li>Finish: ${this.workoutJSON.finish}</li>
        <li>Average Speed: ${this.mph(this.workoutJSON.average_speed)}</li>
        <li>Duration: ${this.minutes(this.workoutJSON.duration)}</li>
      </ul>
    `

    this.workoutMarker.bindTooltip(this.workoutTooltipTemplate);
    this.workoutPolyline.on('mouseover', this.waypointTooltip.bind(this));
  }
}