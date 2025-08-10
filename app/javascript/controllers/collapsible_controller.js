import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content", "toggle"]

  connect() {
    // Initialize as expanded
    this.expanded = true
  }

  toggle() {
    this.expanded = !this.expanded

    if (this.expanded) {
      this.expand()
    } else {
      this.collapse()
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
