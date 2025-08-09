# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "leaflet" # @1.9.4
pin "leaflet-providers" # @2.0.0
pin "plotly" # @1.0.6
pin "buffer" # @2.1.0
pin "http" # @2.1.0
pin "https" # @2.1.0
pin "url" # @2.1.0
