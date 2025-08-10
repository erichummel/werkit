import { Controller } from "@hotwired/stimulus"
import * as THREE from "three"

export default class extends Controller {
  static targets = ["canvas"]
  static values = {
    workoutData: Object,
    waypoints: Array
  }

  connect() {
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

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8)
    this.scene.add(ambientLight)

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 50, 50)
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
      side: THREE.DoubleSide
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

    // Use the same bounds as the map for proper alignment
    const latRange = maxLat - minLat
    const lngRange = maxLng - minLng

    // Scale to fit within the 200x200 ground plane
    const scale = Math.max(latRange, lngRange) / 180 // Leave some margin

    return waypoints.map((point, index) => ({
      x: ((point.longitude - minLng) / scale) - 90, // Center horizontally
      z: ((point.latitude - minLat) / scale) - 90, // Center vertically
      y: (point.altitude || 0) * 0.1, // Scale elevation
      speed: point.speed || 0,
      index: index
    }))
  }

  createRouteLine(points) {
    if (points.length < 2) return

    // Create geometry for the route line
    const geometry = new THREE.BufferGeometry()
    const positions = []
    const colors = []

    points.forEach((point, index) => {
      positions.push(point.x, point.y, point.z)

      // Color based on speed (green = slow, red = fast)
      const speedRatio = Math.min(point.speed / 30, 1) // Assuming max speed of 30 m/s
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

    // Create a 3D elevation profile
    const geometry = new THREE.BufferGeometry()
    const positions = []

    points.forEach((point, index) => {
      // Create a small cube at each point to show elevation
      const size = 0.5
      const cubeGeometry = new THREE.BoxGeometry(size, size, size)
      const cubeMaterial = new THREE.MeshLambertMaterial({
        color: 0x4444ff,
        transparent: true,
        opacity: 0.7
      })
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
      cube.position.set(point.x, point.y + size/2, point.z)
      cube.castShadow = true
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
