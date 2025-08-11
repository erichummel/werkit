import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "latScale", "latScaleValue", "lngScale", "lngScaleValue",
    "rotation", "rotationValue", "latOffset", "latOffsetValue",
    "lngOffset", "lngOffsetValue", "flipX", "flipZ", "swapAxes",
    "elevationScale", "elevationScaleValue"
  ]

  connect() {
    // Try to connect to the Three.js controller with retry mechanism
    this.attemptConnection()
  }

  attemptConnection() {
    // Use global reference to the Three.js controller
    this.threeController = window.three_workout_controller

    if (!this.threeController) {
      console.log('Three.js controller not found in global scope, retrying in 100ms...')
      // Retry after a short delay to allow Three.js controller to initialize
      setTimeout(() => {
        this.attemptConnection()
      }, 100)
      return
    }

    console.log('Projection controls connected to Three.js controller via global reference')
    this.updateDisplayValues()
  }

  // Scale controls
  updateLatScale() {
    const value = parseFloat(this.latScaleTarget.value)
    this.latScaleValueTarget.textContent = value.toFixed(1)
    this.updateProjection()
  }

  updateLngScale() {
    const value = parseFloat(this.lngScaleTarget.value)
    this.lngScaleValueTarget.textContent = value.toFixed(1)
    this.updateProjection()
  }

  // Rotation control
  updateRotation() {
    const value = parseInt(this.rotationTarget.value)
    this.rotationValueTarget.textContent = `${value}°`
    this.updateProjection()
  }

  // Offset controls
  updateLatOffset() {
    const value = parseFloat(this.latOffsetTarget.value)
    this.latOffsetValueTarget.textContent = value.toFixed(4)
    this.updateProjection()
  }

  updateLngOffset() {
    const value = parseFloat(this.lngOffsetTarget.value)
    this.lngOffsetValueTarget.textContent = value.toFixed(4)
    this.updateProjection()
  }

  // Axis controls
  updateFlipX() {
    this.updateProjection()
  }

  updateFlipZ() {
    this.updateProjection()
  }

  updateSwapAxes() {
    this.updateProjection()
  }

  // Elevation control
  updateElevationScale() {
    const value = parseFloat(this.elevationScaleTarget.value)
    this.elevationScaleValueTarget.textContent = value.toFixed(2)
    this.updateProjection()
  }

  // Action buttons
  resetToDefaults() {
    this.latScaleTarget.value = 1.0
    this.lngScaleTarget.value = 1.0
    this.rotationTarget.value = 0
    this.latOffsetTarget.value = 0
    this.lngOffsetTarget.value = 0
    this.flipXTarget.checked = false
    this.flipZTarget.checked = true
    this.swapAxesTarget.checked = false
    this.elevationScaleTarget.value = 0.1

    this.updateDisplayValues()
    this.updateProjection()
  }

  applyChanges() {
    this.updateProjection()
    // Could add a visual feedback here
    console.log('Projection parameters applied')
  }

  updateDisplayValues() {
    this.latScaleValueTarget.textContent = this.latScaleTarget.value
    this.lngScaleValueTarget.textContent = this.lngScaleTarget.value
    this.rotationValueTarget.textContent = `${this.rotationTarget.value}°`
    this.latOffsetValueTarget.textContent = parseFloat(this.latOffsetTarget.value).toFixed(4)
    this.lngOffsetValueTarget.textContent = parseFloat(this.lngOffsetTarget.value).toFixed(4)
    this.elevationScaleValueTarget.textContent = this.elevationScaleTarget.value
  }

  updateProjection() {
    if (!this.threeController) {
      console.warn('Three.js controller not available for projection update')
      return
    }

    const params = {
      latScale: parseFloat(this.latScaleTarget.value),
      lngScale: parseFloat(this.lngScaleTarget.value),
      rotation: parseInt(this.rotationTarget.value) * Math.PI / 180, // Convert to radians
      latOffset: parseFloat(this.latOffsetTarget.value),
      lngOffset: parseFloat(this.lngOffsetTarget.value),
      groundSize: 180,
      centerOffset: 90,
      elevationScale: parseFloat(this.elevationScaleTarget.value),
      flipX: this.flipXTarget.checked,
      flipZ: this.flipZTarget.checked,
      swapAxes: this.swapAxesTarget.checked
    }

    console.log('Updating projection with params:', params)

    // Update the three.js controller's projection parameters
    if (typeof this.threeController.updateProjectionParams === 'function') {
      this.threeController.updateProjectionParams(params)
    } else {
      console.error('updateProjectionParams method not found on Three.js controller')
    }
  }
}
