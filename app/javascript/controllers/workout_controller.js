import { Controller } from "@hotwired/stimulus"
const baseRideInterval = 1000;

export default class extends Controller {
  static values = {
    url: String,
    colorWheel: {
      type: Array,
      default: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
    },
  }

  mph(mps) {
    const mphConversionFactor = 2.23694;
    return mps * mphConversionFactor;
  }
  feet(meters) {
    const feetConversionFactor = 3.28084;
    return meters * feetConversionFactor;
  }

  miles(meters) {
    return meters * 0.000621371;
  }

  minutes(seconds) {
    const minutesConversionFactor = 60;
    return seconds / minutesConversionFactor;
  }

  elevationData(workout) {
    return {
      x: workout.waypoints.map((waypoint, index) => { return index }),
      y: workout.waypoints.map((waypoint) => { return this.feet(waypoint.table.altitude) }),
    };
  }

  velocityData(workout) {
    return {
      x: workout.waypoints.map((waypoint, index) => { return index }),
      y: workout.waypoints.map((waypoint) => { return this.mph(waypoint.table.speed) }),
    };
  }

  timestampForWaypoint(waypoint) {
    const timestampString = waypoint.table.timestamp;
    const withoutTimeZone = timestampString.replace(/\s+[-+]\d+$/, '');
    return (new Date(withoutTimeZone).getTime());
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

  workoutOverlayTemplate(workout) {
    if (!workout) {
      return '';
    }
    return `<div class='workout-stats'>
      <ul class='column'>
        <li class='heading'><div class='column'>1/1/11: ${this.timeOfDay(workout.started_at)}-${this.timeOfDay(workout.ended_at)}</li>
        <li>${this.miles(this.calculatedDistance()).toPrecision(4)} miles</li>
      </ul>
      <div class='graph' id='elevation-graph'></div>
      <div class='graph' id='velocity-graph'></div>
    </div>
    `;
  }

  nearbyWaypoints(waypoint, count) {
    const waypointIndex = this.selectedWorkoutWaypoints().indexOf(waypoint);
    return this.selectedWorkoutWaypoints().slice(waypointIndex - count, waypointIndex + count);
  }

  calculatedDistance() {
    return this.selectedWorkoutWaypoints().reduce((function(totalDistance, waypoint, index) {
      if (index > 0) {
        totalDistance += this.waypointDistanceFromWaypoint(waypoint, this.selectedWorkoutWaypoints()[index - 1]);
      }
      return totalDistance;
    }).bind(this), 0);
  }

  selectWaypointForEvent(event) {
    const waypoint = this.findWaypoint(event.latlng, this.selectedWorkoutWaypoints());
    const oppositeWaypoint = this.findOppositeWaypoint(waypoint, this.selectedWorkoutWaypoints());
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
    if (this.keystrokesBound) {
      return;
    }
    this.keystrokesBound = true;
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
    this.showWorkoutOverlay(this.selectedWorkout);
    this.showWaypointMarker(waypoint);
    return waypoint;
  }

  selectedWorkoutWaypoints() {
    return this.loadedWorkouts[this.selectedWorkout.id].waypoints;
  }

  selectedWaypointIndex() {
    if(!this.selectedWaypoint) {
      return 0;
    }
    return this.selectedWorkoutWaypoints().indexOf(this.selectedWaypoint);
  }

  nextWaypoint(){
    return this.selectedWorkoutWaypoints()[this.selectedWaypointIndex() + 1] || this.selectedWaypoint;
  }

  previousWaypoint(){
    return this.selectedWorkoutWaypoints()[this.selectedWaypointIndex() - 1] || this.selectedWaypoint;
  }

  selectNextWaypoint() {
    return this.selectWaypoint(this.nextWaypoint());
  }

  selectPreviousWaypoint() {
    return this.selectWaypoint(this.previousWaypoint());
  }

  resetWaypoint() {
    return this.selectWaypoint(this.selectedWorkoutWaypoints()[0]);
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

  showWorkoutOverlay(workout) {
    const workoutOverlay = document.getElementById('workout-stats');
    workoutOverlay.innerHTML = this.workoutOverlayTemplate(workout);
    // this.showElevationGraph(workout);
    // this.showVelocityGraph(workout);
  }

  showElevationGraph(workout, waypoint) {
    const graphContainer = document.getElementById('elevation-graph');
    const data = this.elevationData(workout);
    Plotly.newPlot(graphContainer, [data], {
      title: "Elevation",
      margin: { t: 0 },
      responsive: true,
    });
  }

  showVelocityGraph(workout) {
    const graphContainer = document.getElementById('velocity-graph');
    const data = this.velocityData(workout);
    Plotly.newPlot(graphContainer, [data], {
      title: "Velocity",
      margin: { t: 0 },
      responsive: true,
    });
  }

  showWaypointOverlay(waypoint) {
    const waypointOverlay = document.getElementById('waypoint-stats');
    waypointOverlay.innerHTML = this.waypointOverlayTemplate(waypoint);
    if(!this.waypointOverlayInitialized) {
      this.bindAnimationControlClicks(waypointOverlay);
      this.waypointOverlayInitialized = true;
    }
  }

  drawWorkoutRoute(workout) {
    const mapContainer = document.getElementById('workout-map');
    mapContainer.style['height'] = `${window.innerHeight - 20}px`
    this.centerMapAndDrawRoute(workout, mapContainer);
    const resizeObserver = new ResizeObserver(() => {
      this.map.invalidateSize();
    });
    resizeObserver.observe(mapContainer);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.bindKeyStrokes();
  }

  centerMapAndDrawRoute(workout, mapContainer){
    (this.map ||= L.map(mapContainer)).setView(workout.middle_point, 13);
    if (workout.polyline) {
      workout.polyline.bringToFront();
      return;
    }

    workout.polyline = L.polyline(workout.waypoints_latlng, {color: this.nextRouteColor()}).addTo(this.map);
    workout.polyline.on('click', this.selectWaypointForEvent.bind(this));
  }

  nextRouteColor() {
    this.colorWheelValue.push(this.colorWheelValue.shift());
    return this.colorWheelValue[0];
  }

  toggleSelected(event){
    const workoutEl = event.target.closest("div.workout");
    const workoutID = workoutEl.dataset.id;
    this.selectWorkout(workoutID);
  }

  selectWorkout(workoutID) {
    this.clearSelectedWorkout();
    this.workouts.find((workout) => {
      if(workout.id == workoutID){
        this.selectedWorkout = workout;
        this.markSelectedWorkout(document.querySelector(`.workout[data-id="${workout.id}"]`));
      }

      if(workout.id == workoutID && !this.loadedWorkouts[workoutID]){
        this.fetchWorkout(workout);
      }else if (workout.id == workoutID){
        this.drawWorkoutRoute(this.loadedWorkouts[workoutID]);
      }
    });
  }

  clearSelectedWorkout() {
    document.querySelectorAll('.workout').forEach((workoutEl) => {
      workoutEl.classList.remove('selected');
    });
  }

  markSelectedWorkout(workoutEl) {
    workoutEl.classList.add('selected');
  }

  fetchWorkout(workout) {
    fetch(`/workouts/${workout.id}.json`).
    then(response => response.json()).
    then(responseWorkout => {
      this.loadedWorkouts[workout.id] = Object.assign(workout, responseWorkout);
      this.drawWorkoutRoute(workout);
    });
  }

  fetchWorkouts() {
    this.loadedWorkouts ||= {};

    fetch(this.urlValue).
    then(response => response.json()).
    then(data => {
      this.workouts = data;
      this.selectWorkout(this.workouts[0].id);
    });
  }

  connect() {
    window.werker = this;
    if(this.hasUrlValue) {
      this.fetchWorkouts();
    };
  }
}