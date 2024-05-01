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

  closeInSpace(waypoint1, waypoint2) {
    const distance = this.waypointDistanceFromWaypoint(waypoint1, waypoint2);
    return distance < 10;
  }

  closeInTime(waypoint1, waypoint2) {
    return Math.abs(this.timestampForWaypoint(waypoint1) - this.timestampForWaypoint(waypoint2)) < 60000;
  }

  oppositeDirections(waypoint1, waypoint2) {
    const course1 = waypoint1.table.course;
    const course2 = waypoint2.table.course;

    return Math.abs(course1 - course2) > 120;
  }

  waypointDistanceFromPoint(waypoint, point) {
    return L.latLng(waypoint.table.latitude, waypoint.table.longitude).distanceTo(L.latLng(point.x, point.y));
  }

  waypointDistanceFromWaypoint(waypoint1, waypoint2) {
    return L.latLng(waypoint1.table.latitude, waypoint1.table.longitude)
      .distanceTo(L.latLng(waypoint2.table.latitude, waypoint2.table.longitude));
  }

  coordinatesMatch(waypoint1, waypoint2) {
    return waypoint1.table.latitude == waypoint2.table.latitude &&
      waypoint1.table.longitude == waypoint2.table.longitude;
  }

  findWaypoint(latlng, waypoints) {
    var nearestWaypoint = waypoints[0];
    const exactWaypoint = waypoints.find((function(searchWaypoint) {
      const mousePoint = L.point(latlng.lat, latlng.lng);
      if (this.waypointDistanceFromPoint(searchWaypoint, mousePoint) <
          this.waypointDistanceFromPoint(nearestWaypoint, mousePoint)) {
        nearestWaypoint = searchWaypoint;
      }
      return searchWaypoint.table.latitude == latlng.lat &&
        searchWaypoint.table.longitude == latlng.lng;
    }).bind(this));

    return exactWaypoint || nearestWaypoint;
  }

  findOppositeWaypoint(waypoint, waypoints) {
    var nearestOppositeWaypoint = waypoints[0];
    const oppositeWaypoint = waypoints.find((function(searchWaypoint) {
      const searchPoint = L.point(searchWaypoint.table.latitude, searchWaypoint.table.longitude);
      if (this.closeInSpace(waypoint, searchWaypoint) &&
          !this.closeInTime(waypoint, searchWaypoint) &&
          this.oppositeDirections(waypoint, searchWaypoint) &&
          this.waypointDistanceFromPoint(waypoint, searchPoint) < this.waypointDistanceFromPoint(nearestOppositeWaypoint, searchPoint)
        ) {
        nearestOppositeWaypoint = searchWaypoint;
      }
      return this.coordinatesMatch(waypoint, searchWaypoint) &&
        this.oppositeDirections(waypoint, searchWaypoint);
    }).bind(this));

    return oppositeWaypoint || this.closeInSpace(waypoint, nearestOppositeWaypoint) && nearestOppositeWaypoint;
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
      { name: 'N', min: 348.75, max: 11.25, emoji: '↑' },
      { name: 'NNE', min: 11.25, max: 33.75, emoji: '↗️' },
      { name: 'NE', min: 33.75, max: 56.25, emoji: '↗️' },
      { name: 'ENE', min: 56.25, max: 78.75, emoji: '↗️' },
      { name: 'E', min: 78.75, max: 101.25, emoji: '➡️' },
      { name: 'ESE', min: 101.25, max: 123.75, emoji: '↘️' },
      { name: 'SE', min: 123.75, max: 146.25, emoji: '↘️' },
      { name: 'SSE', min: 146.25, max: 168.75, emoji: '↘️' },
      { name: 'S', min: 168.75, max: 191.25, emoji: '↓' },
      { name: 'SSW', min: 191.25, max: 213.75, emoji: '↙️' },
      { name: 'SW', min: 213.75, max: 236.25, emoji: '↙️' },
      { name: 'WSW', min: 236.25, max: 258.75, emoji: '↙️' },
      { name: 'W', min: 258.75, max: 281.25, emoji: '←' },
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

  timeOfDay(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  waypointTooltipTemplate(waypoint) {
    if (!waypoint) {
      return '';
    }
    return `
      Waypoint:
      <ul>
        <li>${this.speedEmojiForWaypoint(waypoint)} ${this.directionEmojiForWaypoint(waypoint)} ${this.timeOfDay(waypoint.table.timestamp)}</li>
        <li>Lat/Long: ${waypoint.table.latitude.toPrecision(6)}/${waypoint.table.longitude.toPrecision(6)}</li>
        <li>Altitude: ${this.feet(waypoint.table.altitude).toPrecision(5)}</li>
        <li>Speed: ${this.mph(waypoint.table.speed).toPrecision(4)}</li>
      </ul>
    `;
  }

  nearbyWaypoints(waypoint) {
    return this.waypoints.filter((function(searchWaypoint) {
      return this.waypointDistanceFromWaypoint(waypoint, searchWaypoint) < 5;
    }).bind(this));
  }

  waypointMarker(waypoint) {
    return L.marker(L.latLng(waypoint.table.latitude, waypoint.table.longitude)).addTo(this.map);
  }

  calculatedDistance() {
    return this.waypoints.reduce((function(totalDistance, waypoint, index) {
      if (index > 0) {
        totalDistance += this.waypointDistanceFromWaypoint(waypoint, this.waypoints[index - 1]);
      }
      return totalDistance;
    }).bind(this), 0);
  }

  waypointTooltip(event) {
    const waypoint = this.findWaypoint(event.latlng, this.waypoints);
    const oppositeWaypoint = this.findOppositeWaypoint(waypoint, this.waypoints);
    const waypointTooltipContents = this.waypointTooltipTemplate(waypoint) + this.waypointTooltipTemplate(oppositeWaypoint);
    const tooltip = L.tooltip()
      .setLatLng(event.latlng)
      .setContent(waypointTooltipContents)
      .addTo(this.map);

    this.map.on('click', function() {
      tooltip.remove();
    });
  }

  initializeMap() {
    this.workoutJSON = window.workoutJSON; // TODO there's gotta be a more railsy way pass this json up to the javascript controller
    const mapContainer = document.getElementById('workout-map');
    this.map = L.map(mapContainer).setView(this.workoutJSON.middle_point, 13);
    const resizeObserver = new ResizeObserver(() => {
      this.map.invalidateSize();
    });
    resizeObserver.observe(mapContainer);

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
        <li>Distance: ${this.calculatedDistance()}</li>
      </ul>
    `

    this.workoutMarker.bindTooltip(this.workoutTooltipTemplate);
    this.workoutPolyline.on('mouseover', this.waypointTooltip.bind(this));
  }
}