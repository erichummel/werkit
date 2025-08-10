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
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x90EE90, // Light green
      side: THREE.DoubleSide
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0x888888)
    gridHelper.position.y = 0.01
    this.scene.add(gridHelper)
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

    // Normalize to scene coordinates (scale to fit in 100x100 area)
    const latRange = maxLat - minLat
    const lngRange = maxLng - minLng
    const scale = Math.max(latRange, lngRange) / 100

    return waypoints.map((point, index) => ({
      x: ((point.longitude - minLng) / scale) - 50,
      z: ((point.latitude - minLat) / scale) - 50,
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
