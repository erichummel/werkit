# README

Werkit is a side project I put together to track my bike rides. Mostly I just wanted to be able to see how fast I was going at an arbitrary point in the ride and couldn't find an easy way to do that from the apple workouts UI. I don't have it hosted anywhere (I just run it on my machine), but maybe someday I will push it live. At the moment it doesn't do much beyond allowing you to create accounts and upload workouts (I use the Health Auto Export app to extract JSON workout files from my iPhone), then admire them on a map so you can see things like velocity, incline, heart rate, etc.

Future features I have planned include things like route planning, "races" (you click a button and the little stick-figure you races other stick-figure yous on a given route), an improved UI, and ultimately in 10 years it'll have feature parity with Strava (an app I've never used but I hear it does things like this 😜).

It's built in stock Rails and it doesn't do anything fancy. I do intend to migrate to proper TypeScript at some point.

No warranty express or implied, etc., maybe someone can find it useful as a quick reference for implementing OpenStreetMap in a project. If you do find a use for it (or even somehow stumble upon this project for some reason) let me know! Pull requests welcome, no promises I'll merge them in, though. Leave an issue if you actually spin this up and have a problem with something; I'd be thrilled to read it, at the very least 😇.

# The UI

Here's a quick screencap of the UI in action, the letters in green are keyboard shortcuts (like I said, it doesn't do much)

[![Click to play](https://github.com/erichummel/werkit/blob/main/public/videos/ui_screenshot.png)](https://github.com/erichummel/werkit/assets/51916/a6ae31a1-f7c1-401b-815b-0aeee25bd2aa)

# 3D Workout View

The show route for workouts now shows a 3D view of the path taken with relative velocities and altitudes represented in a canvas rendering (powered by three.js) - still very rough around the edges as each workout needs to be nudged to fit/scale to the map it's rendered over.

![3D view of workout](https://github.com/erichummel/werkit/blob/main/public/videos/ui_screenshot.png)
