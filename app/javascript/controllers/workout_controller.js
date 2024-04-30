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

    return distance < 10 && Math.abs(this.timestampForWaypoint(waypoint1) - this.timestampForWaypoint(waypoint2)) > 60000;
  }

  oppositeDirections(waypoint1, waypoint2) {
    const course1 = waypoint1.table.course;
    const course2 = waypoint2.table.course;

    return Math.abs(course1 - course2) > 90;
  }

  waypointDistanceFromPoint(waypoint, point) {
    return point.distanceTo(L.point(waypoint.table.latitude, waypoint.table.longitude));
  }

  findWaypoint(latlng, waypoints) { // TODO: I let copilot run wild on this function, it's a mess
    var nearestWaypoint = waypoints[0];
    const exactWaypoint = waypoints.find((function(searchWaypoint) {
      const mousePoint = L.point(latlng.lat, latlng.lng);
      if (this.waypointDistanceFromPoint(searchWaypoint, mousePoint) <
          this.waypointDistanceFromPoint(nearestWaypoint, mousePoint)) {
        nearestWaypoint = searchWaypoint;
      }
      return searchWaypoint.table.latitude == latlng.lat && searchWaypoint.table.longitude == latlng.lng;
    }).bind(this));

    return exactWaypoint || nearestWaypoint;
  }

  findOppositeWaypoint(waypoint, waypoints) { // TODO: same as above, copilot went wild
    var nearestOppositeWaypoint = waypoints[0];
    const oppositeWaypoint = waypoints.find((function(searchWaypoint) {
      const searchPoint = L.point(searchWaypoint.table.latitude, searchWaypoint.table.longitude);
      if (this.waypointDistanceFromPoint(waypoint, searchPoint) <
          this.waypointDistanceFromPoint(nearestOppositeWaypoint, searchPoint) &&
          this.closeInSpaceNotTime(waypoint, searchWaypoint) &&
          this.oppositeDirections(waypoint, searchWaypoint)
        ) {
        nearestOppositeWaypoint = searchWaypoint;
      }
      return waypoint.table.latitude == searchWaypoint.table.latitude &&
        waypoint.table.longitude == searchWaypoint.table.longitude
    }).bind(this));
    return oppositeWaypoint || nearestOppositeWaypoint;
  }


  speedEmojiForWaypoint(waypoint) {
    const speed = waypoint.table.speed;
    if (speed < 1) {
      return '🐢';
    } else if (speed < 3) {
      return '🚶';
    } else if (speed < 6) {
      return '🚲';
    } else if (speed < 9) {
      return '🚗';
    } else {
      return '🚀';
    }
  }

  directionEmojiForWaypoint(waypoint) {
    const course = waypoint.table.course;
    const directions = [
      { name: 'N', min: 348.75, max: 11.25, emoji: '⬆️' },
      { name: 'NNE', min: 11.25, max: 33.75, emoji: '↗️' },
      { name: 'NE', min: 33.75, max: 56.25, emoji: '↗️' },
      { name: 'ENE', min: 56.25, max: 78.75, emoji: '↗️' },
      { name: 'E', min: 78.75, max: 101.25, emoji: '➡️' },
      { name: 'ESE', min: 101.25, max: 123.75, emoji: '↘️' },
      { name: 'SE', min: 123.75, max: 146.25, emoji: '↘️' },
      { name: 'SSE', min: 146.25, max: 168.75, emoji: '↘️' },
      { name: 'S', min: 168.75, max: 191.25, emoji: '⬇️' },
      { name: 'SSW', min: 191.25, max: 213.75, emoji: '↙️' },
      { name: 'SW', min: 213.75, max: 236.25, emoji: '↙️' },
      { name: 'WSW', min: 236.25, max: 258.75, emoji: '↙️' },
      { name: 'W', min: 258.75, max: 281.25, emoji: '⬅️' },
      { name: 'WNW', min: 281.25, max: 303.75, emoji: '↖️' },
      { name: 'NW', min: 303.75, max: 326.25, emoji: '↖️' },
      { name: 'NNW', min: 326.25, max: 348.75, emoji: '↖️' }
    ];

    for (const direction of directions) {
      if (course >= direction.min && course < direction.max) {
        return direction.name + ' ' + direction.emoji;
      }
    }

    return '';
  }

  waypointTooltipTemplate(waypoint) {
    return `
      Waypoint:
      <ul>
        <li>${this.speedEmojiForWaypoint(waypoint)} ${this.directionEmojiForWaypoint(waypoint)}</li>
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
      .addTo(this.map)
      .on('click', function() {
        this.map.closeTooltip(tooltip);
    });
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