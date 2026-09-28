# EcoDash — African Digital Logistics & Infrastructure Simulator

## Description
the simulation is a logistics game where you are a delivery drone is South Africa and have to traverse the suburb and dodge all the elements and structures.
there is loadshedding and natural elements to mimic a real world South African problem.

## The Challenge
Navigating load-shedding blackouts in Johannesburg as a drone.

## Setup / Installation
1. Clone this repo
2. Open index.html in a browser (or use Live Server in VS Code)

## AI Usage Disclosure
Part of project	| AI used?	| How it was used	| What I did myself
README and folder structure	| Yes (Claude)	| Suggested a skeleton and structure	| Filled in my own content
African Context Report	| Yes (Claude)	| Drafted the text	| Chose the theme, added citations, edited
Wireframe	| Yes (ChatGPT)	| Image generator used for a reference layout	The whole redesign as well as all the UI and HUD
Player movement and physics	| Yes (Claude)	| Class skeleton, trig movement, acceleration	| Typed it out, debugged (first-frame deltaTime, prevX placement, typo fixes)
Obstacles and collision	| Yes (Claude)	| Collision functions and obstacle classes	| Questioned the pothole idea and switched to wind, no-fly and signal zones; chose the buildings; tuned sizes
Score, localStorage, screens	| Yes (Claude)	| Code structure	| Typed and integrated it
Visual design	| Yes (Claude)	| Checked do ability and layout	| Directed the layout from reference images and iterated all the designs
Delivery objective and music	| Yes (Claude)	| Code and wiring	| Sourced the audio, tested and tuned
Original feature (wind effect)	| No		| Everything of wind effect

## Original Feature
My non AI feature is the wind effect so in simple terms all of the visual natural elements are basic circles and zones and with the wind effect
i gave it directional wind with streaks going in the direction its blowing and its random every restart of the game
