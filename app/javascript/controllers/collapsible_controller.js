import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content", "toggle"]

  connect() {
    // Check if content is initially collapsed
    this.expanded = !this.contentTarget.classList.contains('collapsed')

    // If initially collapsed, apply collapsed state
    if (!this.expanded) {
      this.collapse()
    }

    // Register this controller for accordion behavior
    if (!window.collapsibleControllers) {
      window.collapsibleControllers = []
    }
    window.collapsibleControllers.push(this)
  }

  disconnect() {
    // Remove this controller from the global list when disconnected
    if (window.collapsibleControllers) {
      const index = window.collapsibleControllers.indexOf(this)
      if (index > -1) {
        window.collapsibleControllers.splice(index, 1)
      }
    }
  }

  toggle() {
    this.expanded = !this.expanded

    if (this.expanded) {
      // Collapse all other panes before expanding this one
      this.collapseOthers()
      this.expand()
    } else {
      this.collapse()
    }
  }

  collapseOthers() {
    if (window.collapsibleControllers) {
      window.collapsibleControllers.forEach(controller => {
        if (controller !== this && controller.expanded) {
          controller.collapse()
          controller.expanded = false
        }
      })
    }
  }

  expand() {
    this.contentTarget.style.maxHeight = this.contentTarget.scrollHeight + "px"
    this.contentTarget.style.opacity = "1"
    this.toggleTarget.querySelector('.toggle-icon').textContent = "−"
    this.element.classList.remove('collapsed')
  }

  collapse() {
    this.contentTarget.style.maxHeight = "0"
    this.contentTarget.style.opacity = "0"
    this.toggleTarget.querySelector('.toggle-icon').textContent = "+"
    this.element.classList.add('collapsed')
  }
}
