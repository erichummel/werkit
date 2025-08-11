import { Controller } from "@hotwired/stimulus"
import * as THREE from "three"

export default class extends Controller {
  static targets = ["canvas"]
  static values = {
    workoutData: Object,
    waypoints: Array
  }

  connect() {
    // Store reference globally for other controllers to access
    window.three_workout_controller = this

    // Unit configuration
    this.units = {
      altitude: 'feet', // 'feet' or 'meters'
      speed: 'mph'      // 'mph' or 'mps' (meters per second)
    }

    this.initThree()
    this.animate()
  }

  disconnect() {
    if (this.renderer) {
      this.renderer.dispose()
    }
  }

  initThree() {
    // Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87CEEB) // Sky blue background

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvasTarget.clientWidth / this.canvasTarget.clientHeight,
      0.1,
      2000
    )
    this.camera.position.set(0, 20, 20)

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasTarget,
      antialias: true
    })
    this.renderer.setSize(this.canvasTarget.clientWidth, this.canvasTarget.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.shadowMap.autoUpdate = true

    // Lighting
    this.setupLighting()

    // Ground plane
    this.createGround()

    // Create workout route
    this.createWorkoutRoute()

    // Controls
    this.setupControls()

    // Mouse interaction
    this.setupMouseInteraction()

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
    this.scene.add(ambientLight)

    // Directional light (sun) - positioned directly overhead
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionalLight.position.set(0, 100, 0)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 500
    directionalLight.shadow.camera.left = -100
    directionalLight.shadow.camera.right = 100
    directionalLight.shadow.camera.top = 100
    directionalLight.shadow.camera.bottom = -100
    directionalLight.shadow.bias = -0.0001
    directionalLight.shadow.normalBias = 0.02
    directionalLight.shadow.intensity = 0.2
    this.scene.add(directionalLight)
  }

  createGround() {
    // Create a large ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200)

    // Create map texture
    this.createMapTexture(groundGeometry)

    // Add grid helper (optional, can be removed if map is clear enough)
    const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0x888888)
    gridHelper.position.y = 0.01
    gridHelper.material.opacity = 0.3
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)
  }

    createMapTexture(geometry) {
    if (!this.waypointsValue || this.waypointsValue.length === 0) {
      // Fallback to simple ground if no waypoints
      const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x90EE90,
        side: THREE.DoubleSide
      })
      const ground = new THREE.Mesh(geometry, groundMaterial)
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      this.scene.add(ground)
      return
    }

    // Calculate bounds and create multi-tile map
    const bounds = this.calculateMapBounds()
    this.createMultiTileMap(geometry, bounds)
  }

  createMultiTileMap(geometry, bounds) {
    const zoom = this.calculateOptimalZoom(bounds)
    const padding = 0.001 // Add some padding around the route

    // Expand bounds with padding
    const expandedBounds = {
      minLat: bounds.minLat - padding,
      maxLat: bounds.maxLat + padding,
      minLng: bounds.minLng - padding,
      maxLng: bounds.maxLng + padding
    }

    // Calculate tile range
    const tileRange = this.calculateTileRange(expandedBounds, zoom)

    // Create a large canvas to combine multiple tiles
    const canvas = document.createElement('canvas')
    const tileSize = 256
    const cols = tileRange.maxX - tileRange.minX + 1
    const rows = tileRange.maxY - tileRange.minY + 1
    canvas.width = cols * tileSize
    canvas.height = rows * tileSize
    const ctx = canvas.getContext('2d')

    // Load all tiles
    let loadedTiles = 0
    const totalTiles = cols * rows

    for (let x = tileRange.minX; x <= tileRange.maxX; x++) {
      for (let y = tileRange.minY; y <= tileRange.maxY; y++) {
        const tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
          const drawX = (x - tileRange.minX) * tileSize
          const drawY = (y - tileRange.minY) * tileSize
          ctx.drawImage(img, drawX, drawY)

          loadedTiles++
          if (loadedTiles === totalTiles) {
            this.createMapMesh(geometry, canvas, expandedBounds)
          }
        }

        img.onerror = () => {
          console.warn(`Failed to load tile: ${tileUrl}`)
          loadedTiles++
          if (loadedTiles === totalTiles) {
            this.createMapMesh(geometry, canvas, expandedBounds)
          }
        }

        img.src = tileUrl
      }
    }
  }

  calculateTileRange(bounds, zoom) {
    const scale = Math.pow(2, zoom)

    const minX = Math.floor((bounds.minLng + 180) / 360 * scale)
    const maxX = Math.floor((bounds.maxLng + 180) / 360 * scale)
    const minY = Math.floor((1 - Math.log(Math.tan(bounds.maxLat * Math.PI / 180) + 1 / Math.cos(bounds.maxLat * Math.PI / 180)) / Math.PI) / 2 * scale)
    const maxY = Math.floor((1 - Math.log(Math.tan(bounds.minLat * Math.PI / 180) + 1 / Math.cos(bounds.minLat * Math.PI / 180)) / Math.PI) / 2 * scale)

    return { minX, maxX, minY, maxY }
  }

  createMapMesh(geometry, canvas, bounds) {
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const groundMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0
    })

    const ground = new THREE.Mesh(geometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    // Store bounds for coordinate mapping
    this.mapBounds = bounds
  }

  calculateMapBounds() {
    const waypoints = this.waypointsValue
    const lats = waypoints.map(p => p.latitude)
    const lngs = waypoints.map(p => p.longitude)

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    }
  }

  calculateOptimalZoom(bounds) {
    const latDiff = bounds.maxLat - bounds.minLat
    const lngDiff = bounds.maxLng - bounds.minLng
    const maxDiff = Math.max(latDiff, lngDiff)

    // Calculate zoom level based on the size of the area
    if (maxDiff > 1) return 10
    if (maxDiff > 0.1) return 12
    if (maxDiff > 0.01) return 14
    if (maxDiff > 0.001) return 16
    return 18
  }

  createWorkoutRoute() {
    if (!this.waypointsValue || this.waypointsValue.length === 0) {
      return
    }

    // Normalize coordinates to fit in our scene
    const normalizedPoints = this.normalizeCoordinates(this.waypointsValue)

    // Create route line
    this.createRouteLine(normalizedPoints)

    // Create elevation profile
    this.createElevationProfile(normalizedPoints)

    // Add start and end markers
    this.createMarkers(normalizedPoints)
  }

    normalizeCoordinates(waypoints) {
    if (waypoints.length === 0) return []

    // Find bounds
    let minLat = Math.min(...waypoints.map(p => p.latitude))
    let maxLat = Math.max(...waypoints.map(p => p.latitude))
    let minLng = Math.min(...waypoints.map(p => p.longitude))
    let maxLng = Math.max(...waypoints.map(p => p.longitude))

    // Use stored projection params or defaults
    if (!this.projectionParams) {
      this.projectionParams = {
        // Scale factors
        latScale: 0.849,      // Latitude scaling factor
        lngScale: 0.861,      // Longitude scaling factor

        // Rotation (in radians)
        rotation: 0,        // Rotation around Y axis

        // Offsets
        latOffset: -0.0435,       // Latitude offset
        lngOffset: 0.0116,       // Longitude offset

        // Ground plane mapping
        groundSize: 180,    // Size of ground plane (200x200 with margin)
        centerOffset: 90,   // Center offset for ground plane

        // Elevation scaling
        elevationScale: 0.2, // How much to scale altitude

        // Axis flipping
        flipX: false,       // Flip X axis
        flipZ: true,        // Flip Z axis (usually needed)

        // Additional transformations
        swapAxes: false     // Swap X and Z axes
      }
    }

    return this.applyMapProjection(waypoints, minLat, maxLat, minLng, maxLng, this.projectionParams)
  }

  updateProjectionParams(newParams) {
    console.log('Three.js controller received projection params:', newParams)
    this.projectionParams = { ...this.projectionParams, ...newParams }
    console.log('Updated projection params:', this.projectionParams)
    this.recreateWorkoutRoute()
  }

  recreateWorkoutRoute() {
    console.log('Recreating workout route...')

    // Remove only the route-specific elements (lines, markers, elevation cubes)
    // Keep the ground plane (map), grid, and lights
    const elementsToRemove = []

    this.scene.children.forEach(child => {
      // Remove lines (route paths)
      if (child.type === 'Line') {
        elementsToRemove.push(child)
      }
      // Remove spheres (start/end markers)
      else if (child.type === 'Mesh' && child.geometry.type === 'SphereGeometry') {
        elementsToRemove.push(child)
      }
      // Remove cubes (elevation markers)
      else if (child.type === 'Mesh' && child.geometry.type === 'BoxGeometry') {
        elementsToRemove.push(child)
      }
    })

    // Remove the identified elements
    elementsToRemove.forEach(element => {
      this.scene.remove(element)
      if (element.geometry) element.geometry.dispose()
      if (element.material) element.material.dispose()
    })

    console.log('Removed route elements:', elementsToRemove.length)
    console.log('Scene children after cleanup:', this.scene.children.length)

    // Recreate the workout route with new parameters
    this.createWorkoutRoute()
    console.log('Workout route recreated')
  }

  applyMapProjection(waypoints, minLat, maxLat, minLng, maxLng, params) {
    const latRange = maxLat - minLat
    const lngRange = maxLng - minLng

    // Calculate scale based on the larger range
    const maxRange = Math.max(latRange, lngRange)
    const scale = maxRange / params.groundSize

    return waypoints.map((point, index) => {
      // Apply scaling and offsets
      let lat = (point.latitude - minLat) * params.latScale + params.latOffset
      let lng = (point.longitude - minLng) * params.lngScale + params.lngOffset

      // Apply axis flipping
      if (params.flipX) lng = -lng
      if (params.flipZ) lat = -lat

      // Apply rotation (if needed)
      if (params.rotation !== 0) {
        const cos = Math.cos(params.rotation)
        const sin = Math.sin(params.rotation)
        const newLat = lat * cos - lng * sin
        const newLng = lat * sin + lng * cos
        lat = newLat
        lng = newLng
      }

      // Map to ground plane coordinates
      let x, z
      if (params.swapAxes) {
        x = (lat / scale) - params.centerOffset
        z = (lng / scale) - params.centerOffset
      } else {
        x = (lng / scale) - params.centerOffset
        z = (lat / scale) - params.centerOffset
      }

      return {
        x: x,
        z: z,
        y: (point.altitude || 0) * params.elevationScale,
        speed: point.speed || 0,
        index: index
      }
    })
  }

  createRouteLine(points) {
    if (points.length < 2) return

    // Calculate actual speed range from the data
    const speeds = points.map(point => point.speed)
    const minSpeed = Math.min(...speeds)
    const maxSpeed = Math.max(...speeds)
    const speedRange = maxSpeed - minSpeed

    // Create geometry for the route line
    const geometry = new THREE.BufferGeometry()
    const positions = []
    const colors = []

    points.forEach((point, index) => {
      positions.push(point.x, point.y, point.z)

      // Color based on speed relative to actual range (green = slow, red = fast)
      const speedRatio = speedRange > 0 ? (point.speed - minSpeed) / speedRange : 0
      const color = new THREE.Color()
      color.setHSL(0.3 * (1 - speedRatio), 1, 0.5) // Green to red
      colors.push(color.r, color.g, color.b)
    })

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3
    })

    const line = new THREE.Line(geometry, material)
    this.scene.add(line)
  }

    createElevationProfile(points) {
    if (points.length < 2) return

    // Calculate actual speed range from the data
    const speeds = points.map(point => point.speed)
    const minSpeed = Math.min(...speeds)
    const maxSpeed = Math.max(...speeds)
    const speedRange = maxSpeed - minSpeed

    console.log(`Speed range: ${minSpeed} to ${maxSpeed} m/s (range: ${speedRange})`)

    // Store cubes for mouse interaction
    this.waypointCubes = []

    points.forEach((point, index) => {
      // Create a small cube at each point to show elevation
      const size = 0.5
      const cubeGeometry = new THREE.BoxGeometry(size, size, size)

      // Color based on speed relative to actual range (green = slow, red = fast)
      const speedRatio = speedRange > 0 ? (point.speed - minSpeed) / speedRange : 0
      const color = new THREE.Color()
      color.setHSL(0.3 * (1 - speedRatio), 1, 0.5) // Green to red

      const cubeMaterial = new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
      })
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
      cube.position.set(point.x, point.y + size/2, point.z)
      cube.castShadow = true

            // Store original scale and waypoint data for interaction
      cube.userData = {
        originalScale: 1, // Store the scale factor, not the geometry size
        waypointIndex: index,
        waypointData: point,
        // Store the original waypoint data from the source
        originalWaypointData: this.waypointsValue[index]
      }

      // Initialize scale to 1 (normal size)
      cube.scale.setScalar(1)

      this.waypointCubes.push(cube)
      this.scene.add(cube)
    })
  }

  createMarkers(points) {
    if (points.length === 0) return

    // Start marker (green)
    const startGeometry = new THREE.SphereGeometry(1, 16, 16)
    const startMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
    const startMarker = new THREE.Mesh(startGeometry, startMaterial)
    startMarker.position.set(points[0].x, points[0].y + 1, points[0].z)
    startMarker.castShadow = true
    this.scene.add(startMarker)

    // End marker (red)
    if (points.length > 1) {
      const endGeometry = new THREE.SphereGeometry(1, 16, 16)
      const endMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 })
      const endMarker = new THREE.Mesh(endGeometry, endMaterial)
      endMarker.position.set(
        points[points.length - 1].x,
        points[points.length - 1].y + 1,
        points[points.length - 1].z
      )
      endMarker.castShadow = true
      this.scene.add(endMarker)
    }
  }

  setupControls() {
    // Simple orbit controls
    this.controls = {
      rotationX: 0.70, // Approximately 20 degrees in radians
      rotationY: 0,
      distance: 100
    }

    // Mouse controls
    let isMouseDown = false
    let mouseX = 0
    let mouseY = 0

    this.canvasTarget.addEventListener('mousedown', (event) => {
      isMouseDown = true
      mouseX = event.clientX
      mouseY = event.clientY
    })

    this.canvasTarget.addEventListener('mouseup', () => {
      isMouseDown = false
    })

    this.canvasTarget.addEventListener('mousemove', (event) => {
      if (isMouseDown) {
        const deltaX = event.clientX - mouseX
        const deltaY = event.clientY - mouseY

        this.controls.rotationY += deltaX * 0.01
        this.controls.rotationX += deltaY * 0.01

        mouseX = event.clientX
        mouseY = event.clientY
      }
    })

    // Zoom with mouse wheel
    this.canvasTarget.addEventListener('wheel', (event) => {
      this.controls.distance += event.deltaY * 0.1
      this.controls.distance = Math.max(2, Math.min(200, this.controls.distance))
    })
  }

    setupMouseInteraction() {
    // Raycaster for mouse interaction
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.hoveredCube = null
    this.selectedCube = null

    // Mouse move event for hover detection
    this.canvasTarget.addEventListener('mousemove', (event) => {
      // Calculate mouse position in normalized device coordinates
      const rect = this.canvasTarget.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Perform raycasting
      this.raycaster.setFromCamera(this.mouse, this.camera)

      if (this.waypointCubes) {
        const intersects = this.raycaster.intersectObjects(this.waypointCubes)

        if (intersects.length > 0) {
          const cube = intersects[0].object
          if (this.hoveredCube !== cube) {
            // Mouse entered a new cube
            if (this.hoveredCube) {
              this.onCubeMouseOut(this.hoveredCube)
            }
            this.hoveredCube = cube
            // Only apply hover effect if cube is not selected
            if (cube !== this.selectedCube) {
              this.onCubeMouseOver(cube)
            }
          }
        } else {
          // Mouse left all cubes
          if (this.hoveredCube) {
            this.onCubeMouseOut(this.hoveredCube)
            this.hoveredCube = null
          }
        }
      }
    })

    // Mouse click event for waypoint selection
    this.canvasTarget.addEventListener('click', (event) => {
      if (this.waypointCubes) {
        const intersects = this.raycaster.intersectObjects(this.waypointCubes)

        if (intersects.length > 0) {
          const cube = intersects[0].object
          this.selectWaypoint(cube)
        }
      }
    })
  }

  selectWaypoint(cube) {
    // Deselect previous waypoint
    if (this.selectedCube) {
      this.deselectWaypoint(this.selectedCube)
    }

    // Select new waypoint
    this.selectedCube = cube
    this.animateCubeScale(cube, 3) // Scale to 3x

    // Update waypoint details pane
    this.updateWaypointDetails(cube)
  }

  deselectWaypoint(cube) {
    this.selectedCube = null
    this.animateCubeScale(cube, 1) // Return to normal size
    this.hideWaypointDetails()
  }

  updateWaypointDetails(cube) {
    const waypointData = cube.userData.waypointData
    const originalWaypointData = cube.userData.originalWaypointData
    const index = cube.userData.waypointIndex

    // Create or update the waypoint details pane
    this.createWaypointDetailsPane(waypointData, originalWaypointData, index)
  }

  hideWaypointDetails() {
    const existingPane = document.getElementById('waypoint-details-pane')
    if (existingPane) {
      existingPane.remove()
    }
  }

  // Unit conversion helpers
  convertAltitude(meters) {
    if (this.units.altitude === 'feet') {
      return meters * 3.28084 // Convert meters to feet
    }
    return meters // Return meters
  }

  convertSpeed(mps) {
    if (this.units.speed === 'mph') {
      return mps * 2.23694 // Convert m/s to mph
    }
    return mps // Return m/s
  }

  getAltitudeUnit() {
    return this.units.altitude === 'feet' ? 'ft' : 'm'
  }

  getSpeedUnit() {
    return this.units.speed === 'mph' ? 'mph' : 'm/s'
  }

  createWaypointDetailsPane(waypointData, originalWaypointData, index) {
    // Remove existing pane if it exists
    this.hideWaypointDetails()

    // Debug: log the waypoint data to see what's available
    console.log('Processed waypoint data:', waypointData)
    console.log('Original waypoint data:', originalWaypointData)

    // Create the waypoint details pane
    const pane = document.createElement('div')
    pane.id = 'waypoint-details-pane'
    pane.className = 'waypoint-details-overlay'
    pane.setAttribute('data-controller', 'collapsible')

    // Format the data for display using original data for coordinates and altitude
    const speedValue = waypointData.speed ? this.convertSpeed(waypointData.speed) : null
    const speed = speedValue ? `${speedValue.toFixed(1)} ${this.getSpeedUnit()}` : 'N/A'

    const altitudeValue = originalWaypointData?.altitude ? this.convertAltitude(originalWaypointData.altitude) : null
    const altitude = altitudeValue ? `${altitudeValue.toFixed(0)} ${this.getAltitudeUnit()}` : 'N/A'

    const coordinates = originalWaypointData ? `${originalWaypointData.latitude?.toFixed(6) || 'N/A'}, ${originalWaypointData.longitude?.toFixed(6) || 'N/A'}` : 'N/A, N/A'

    pane.innerHTML = `
      <div class="overlay-header">
        <h3>Waypoint ${index + 1}</h3>
        <button class="toggle-btn" data-action="click->collapsible#toggle" data-collapsible-target="toggle">
          <span class="toggle-icon">−</span>
        </button>
      </div>

      <div class="overlay-content" data-collapsible-target="content">
        <div class="waypoint-info">
          <div class="waypoint-stats">
            <div class="stat">
              <span class="label">Speed:</span>
              <span class="value">${speed}</span>
            </div>
            <div class="stat">
              <span class="label">Altitude:</span>
              <span class="value">${altitude}</span>
            </div>
            <div class="stat">
              <span class="label">Coordinates:</span>
              <span class="value">${coordinates}</span>
            </div>
            <div class="stat">
              <span class="label">Position:</span>
              <span class="value">X: ${waypointData.x?.toFixed(2) || 'N/A'}, Y: ${waypointData.y?.toFixed(2) || 'N/A'}, Z: ${waypointData.z?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    `

    // Add to the page
    document.body.appendChild(pane)
  }

  onCubeMouseOver(cube) {
    // Animate cube to 2x size
    const targetScale = 2
    this.animateCubeScale(cube, targetScale)
  }

  onCubeMouseOut(cube) {
    // Only animate back to original size if cube is not selected
    if (cube !== this.selectedCube) {
      const targetScale = 1
      this.animateCubeScale(cube, targetScale)
    }
  }

  animateCubeScale(cube, targetScale) {
    const startScale = cube.scale.x
    const duration = 200 // milliseconds
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentScale = startScale + (targetScale - startScale) * easeOut

      cube.scale.setScalar(currentScale)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))

    // Update camera position based on controls
    const x = this.controls.distance * Math.sin(this.controls.rotationY) * Math.cos(this.controls.rotationX)
    const y = this.controls.distance * Math.sin(this.controls.rotationX)
    const z = this.controls.distance * Math.cos(this.controls.rotationY) * Math.cos(this.controls.rotationX)

    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 0, 0)

    this.renderer.render(this.scene, this.camera)
  }

  onWindowResize() {
    this.camera.aspect = this.canvasTarget.clientWidth / this.canvasTarget.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.canvasTarget.clientWidth, this.canvasTarget.clientHeight)
  }
}
