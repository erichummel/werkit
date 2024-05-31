import { Controller } from "@hotwired/stimulus"
const baseRideInterval = 1000;

export default class extends Controller {
  static values = {
    workouts: Array,
    loadedWorkouts: Object,
    url: String,
    foo: String,
  }

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
    if(!waypoint1 || !waypoint2) {
      return 0;
    }
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
      { name: '&nbsp;N&nbsp;', min: 348.75, max: 11.25, emoji: '↑' },
      { name: 'NNE', min: 11.25, max: 33.75, emoji: '↗️' },
      { name: 'NE&nbsp;', min: 33.75, max: 56.25, emoji: '↗️' },
      { name: 'ENE', min: 56.25, max: 78.75, emoji: '↗️' },
      { name: '&nbsp;E&nbsp;', min: 78.75, max: 101.25, emoji: '➡️' },
      { name: 'ESE', min: 101.25, max: 123.75, emoji: '↘️' },
      { name: 'SE&nbsp;', min: 123.75, max: 146.25, emoji: '↘️' },
      { name: 'SSE', min: 146.25, max: 168.75, emoji: '↘️' },
      { name: '&nbsp;S&nbsp;', min: 168.75, max: 191.25, emoji: '↓' },
      { name: 'SSW', min: 191.25, max: 213.75, emoji: '↙️' },
      { name: 'SW&nbsp;', min: 213.75, max: 236.25, emoji: '↙️' },
      { name: 'WSW', min: 236.25, max: 258.75, emoji: '↙️' },
      { name: '&nbsp;W&nbsp;', min: 258.75, max: 281.25, emoji: '←' },
      { name: 'WNW', min: 281.25, max: 303.75, emoji: '↖️' },
      { name: 'NW&nbsp;', min: 303.75, max: 326.25, emoji: '↖️' },
      { name: 'NNW', min: 326.25, max: 348.75, emoji: '↖️' }
    ];

    for (const direction of directions) {
      if (course >= direction.min && direction.max < direction.min || course < direction.max) {
        return `<span style="font-family: monospace"> ${direction.emoji + ' ' + direction.name}</span>`;
      }
    }

    return '';
  }

  easterly(waypoint){
    return !waypoint || waypoint.table.course >= 0 && waypoint.table.course < 180;
  }

  inclineForWaypoint(waypoint) {
    const nearby = this.nearbyWaypoints(waypoint, 3);
    const incline = nearby.reduce((function(totalIncline, waypoint, index) {
      if (index > 0) {
        totalIncline += waypoint.table.altitude - nearby[index - 1].table.altitude;
      }
      return totalIncline;
    }).bind(this), 0);

    const length = this.waypointDistanceFromWaypoint(nearby[0], nearby[nearby.length - 1]);

    return Math.atan(incline / length) * 180 / Math.PI * 2.0;
  }


  timeOfDay(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  workoutTooltipTemplate(workoutJSON) {
    return `
      <div class='workoutTooltip'>
        <h4>Workout</h4>
        <ul>
          <li>Start: ${workoutJSON.start}</li>
          <li>Finish: ${workoutJSON.finish}</li>
          <li>Average Speed: ${this.mph(workoutJSON.average_speed)}</li>
          <li>Duration: ${this.minutes(workoutJSON.duration)}</li>
          <li>Distance: ${this.calculatedDistance()}</li>
        </ul>
      </div>
    `
  }

  keyboardControlsTemplate() {
    const animationMultiplier = (baseRideInterval/ this.rideInterval ) + "x";
    var controls;
    if(this.animating()){
      controls = `
        <em>
          <span>${animationMultiplier} &nbsp;</span>
          <span class='button'><strong>r</strong>ide faster &nbsp;</span>
          <span class='button'><strong>p</strong>ause &nbsp;</span>
          <span class='button'>re<strong>s</strong>tart</span>
        </em>`
    } else {
      controls = `
        <em>
          <span class='button'><strong>r</strong>ide &nbsp;</span>
          <span class='button'><strong>f</strong>orward &nbsp;</span>
          <span class='button'>b<strong>a</strong>ck &nbsp;</span>
          <span class='button'>re<strong>s</strong>tart</span>
        </em>`
    }
    return `<div class='animation-controls'>${controls}</div>`;
  }

  waypointOverlayTemplate(waypoint) {
    const inclineForWaypoint = this.inclineForWaypoint(waypoint);
    if (!waypoint) {
      return '';
    }
    return `<div class='waypoint-stats'>
      <ul class='column'>
        <li>${this.timeOfDay(this.timestampForWaypoint(waypoint))}</li>
        <li class='heading'>
          <div class= 'column'>
          ${this.speedEmojiForWaypoint(waypoint)} ${this.mph(waypoint.table.speed).toPrecision(4)} mph
          </div>
          <div class='column right'>
          ${this.directionEmojiForWaypoint(waypoint)}
          </div>
        </li>
        <li>🛰️: ${waypoint.table.latitude.toPrecision(7)}/${waypoint.table.longitude.toPrecision(7)}</li>
        <li>Alt: ${this.feet(waypoint.table.altitude).toPrecision(5)}</li>
        <li>Incline: ${inclineForWaypoint.toPrecision(3)}</li>
      </ul>
      <div class='cyclist ${ this.easterly(waypoint) ? "easterly" : "" }'>
        <div class='incline column ${ this.animating() ? "animating" : ""}' style="transform:rotate(${inclineForWaypoint}deg)"></div>
      </div>
    </div>
    ${this.keyboardControlsTemplate()}
    `;
  }

  nearbyWaypoints(waypoint, count) {
    const waypointIndex = this.waypoints.indexOf(waypoint);
    return this.waypoints.slice(waypointIndex - count, waypointIndex + count);
  }

  calculatedDistance() {
    return this.waypoints.reduce((function(totalDistance, waypoint, index) {
      if (index > 0) {
        totalDistance += this.waypointDistanceFromWaypoint(waypoint, this.waypoints[index - 1]);
      }
      return totalDistance;
    }).bind(this), 0);
  }

  selectWaypointForEvent(event) {
    const waypoint = this.findWaypoint(event.latlng, this.waypoints);
    const oppositeWaypoint = this.findOppositeWaypoint(waypoint, this.waypoints);
    const waypointTooltipContents = this.waypointOverlayTemplate(waypoint) + this.waypointOverlayTemplate(oppositeWaypoint);

    this.waypointTooltip && this.wayPointTooltip.remove();
    this.wayPointTooltip = L.tooltip({direction: "bottom"})
      .setLatLng(event.latlng)
      .setContent(waypointTooltipContents)
      .addTo(this.map);

    this.map.on('click', (function() {
      this.waypointTooltip.remove();
    }).bind(this));
  }

  bindKeyStrokes() {
    document.addEventListener('keydown', this.handleKeyStrokes.bind(this));
  }

  handleKeyStrokes(event) {
    const key = event.key;
    switch (key) {
      case 'r':
        this.startRide();
        break;
      case 'p':
        this.cancelRide();
        this.selectNextWaypoint();
        break;
      case 's':
        this.cancelRide();
        this.resetWaypoint();
        break;
      case 'f':
        this.cancelRide();
        this.selectNextWaypoint();
        break;
      case 'a':
        this.cancelRide();
        this.selectPreviousWaypoint();
        break;
      default:
        break;
    }
  }

  bindAnimationControlClicks(element) {
    element.addEventListener('click', this.handleAnimationControlClicks.bind(this));
  }

  handleAnimationControlClicks(event) {
    const action = event.target.innerText.trim();
    switch (action) {
      case 'ride':
        this.startRide();
        break;
      case 'pause':
        this.cancelRide();
        this.selectNextWaypoint();
        break;
      case 'restart':
        this.resetWaypoint();
        break;
      case 'forward':
        this.cancelRide();
        this.selectNextWaypoint();
        break;
      case 'back':
        this.cancelRide();
        this.selectPreviousWaypoint();
        break;
      default:
        break;
    }
  }

  startRide() {
    if (this.animating()) {
      this.rideInterval = this.rideInterval / 2;
      return;
    }

    this.rideInterval = baseRideInterval;
    this.ride();
  }

  ride() {
    this.rideInterval ||= baseRideInterval;
    this.rideTimeout = setTimeout(this.ride.bind(this), this.rideInterval);
    this.selectNextWaypoint();
  }

  clearRideTimeout() {
    clearTimeout(this.rideTimeout);
    this.rideTimeout = null;
  }

  cancelRide() {
    this.clearRideTimeout();
    this.rideInterval = null;
  }

  animating() {
    return !!this.rideTimeout;
  }

  selectWaypoint(waypoint){
    this.selectedWaypoint = waypoint;
    this.showWaypointOverlay(waypoint);
    this.showWaypointMarker(waypoint);
    return waypoint;
  }

  selectedWaypointIndex() {
    return this.waypoints.indexOf(this.selectedWaypoint);
  }

  nextWaypoint(){
    return this.waypoints[this.selectedWaypointIndex() + 1] || this.selectedWaypoint;
  }

  previousWaypoint(){
    return this.waypoints[this.selectedWaypointIndex() - 1] || this.selectedWaypoint;
  }

  selectNextWaypoint() {
    return this.selectWaypoint(this.nextWaypoint());
  }

  selectPreviousWaypoint() {
    return this.selectWaypoint(this.previousWaypoint());
  }

  resetWaypoint() {
    return this.selectWaypoint(this.waypoints[0]);
  }

  showWaypointMarker(waypoint) {
    if(!waypoint) {
      return;
    }
    const iconSets = {
      easterly: { base: 'cyclist-simple-east.png', shadow: 'cyclist-simple-shadow-east.png'},
      westerly: { base: 'cyclist-simple-west.png', shadow: 'cyclist-simple-shadow-west.png'},
    }
    const iconSet = this.easterly(waypoint) ? iconSets.easterly : iconSets.westerly;
    const icon = L.icon({
      iconUrl: `/assets/${iconSet.base}`,
      shadowUrl: `/assets/${iconSet.shadow}`,
      iconAnchor: [15, 30],
      shadowAnchor: [15, 30],
      className: `cyclist`,
    })
    this.waypointMarker && this.waypointMarker.remove();
    this.waypointMarker = L.marker(L.latLng(waypoint.table.latitude, waypoint.table.longitude), {icon: icon}).addTo(this.map);
  }

  showWaypointOverlay(waypoint) {
    const waypointOverlay = document.getElementById('waypoint-stats');
    waypointOverlay.innerHTML = this.waypointOverlayTemplate(waypoint);
    if(!this.waypointOverlayInitialized) {
      this.bindAnimationControlClicks(waypointOverlay);
      this.waypointOverlayInitialized = true;
    }
  }

  initializeMap(workout) {
    const mapContainer = document.getElementById('workout-map');
    this.map = L.map(mapContainer).setView(workout.middle_point, 13);
    const resizeObserver = new ResizeObserver(() => {
      this.map.invalidateSize();
    });
    resizeObserver.observe(mapContainer);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.waypoints = workout.waypoints;
    this.workoutPolyline = L.polyline(workout.waypoints_latlng, {color: '#00ff00'}).addTo(this.map);

    this.workoutMarker.bindTooltip(this.workoutTooltipTemplate(workout));
    this.workoutPolyline.on('click', this.selectWaypointForEvent.bind(this));
    this.bindKeyStrokes();
  }

  toggleSelected(e){
    const workoutEl = e.target.closest("div.workout");
    const workoutID = workoutEl.dataset.id;
    this.workoutsValue.find((workout) => {
      if(workout.id == workoutID && !this.loadedWorkoutsValue[workoutID]){
        this.fetchWorkout(workout);
        return true
      }else if (workout.id == workoutID){
        this.initializeMap(this.loadedWorkoutsValue[workoutID]);
        return true;
      }
    });
  }

  fetchWorkout(workout) {
    fetch(`/workouts/${workout.id}.json`).
    then(response => response.json()).
    then(workout => {
      this.loadedWorkoutsValue[workout.id] = workout;
      this.initializeMap(workout);
    });
  }

  fetchWorkouts() {
    fetch(this.urlValue).
    then(response => response.json()).
    then(data => {
      this.workoutsValue = data;
      this.fetchWorkout(this.workoutsValue[0]);
    });
  }

  connect() {
    window.werker = this;
    if(this.hasUrlValue) {
      this.fetchWorkouts();
    };
  }
}