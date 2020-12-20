# boids-webgl
An implementation of Craig Reynolds's "Boids" program

# TODO
- [x] fix camera: center on world
- [x] add grid system into simulation
- [ ] fix speed problems with grid system
- [ ] add second, close-up camera
- [ ] average color of boids in nearby cells
- [ ] point boids in the right direction

# Summary of Optimizations
- Replaced `add()` from `MV.js` with an increment function that edits in place
- Uses grid system so that boids only check distance between boids in cells
  it can see
  
# Performance Tuning
Immediately after finishing the naive implementation, I noticed that `add
()` from `MV.js` was taking a huge portion of the computation time when running 
a performance profile. The new function, `increaseArray()` showed much smoother 
frame rates. It avoids making extra arrays in-memory (which get deleted 
immediately) and has a narrower scope, making it much faster.
  
## Grid System
After the naive implementation, I added grid system, as it is a requirement for
this project, but it seemed that frame rates were worse... At this point, I made the two profiles
`before-grid-system.json` and `after-grid-system-01.json`. I noticed that
after the change, average frame rates were worse, but the minimum frame
rate was better.

The first thing to do was eliminate the fact that we're calculating distance
twice, so I lifted that out of the `visibleNeighbors()` function. This
function was renamed to `getNeighbors()`, as they are no longer guaranteed to be 
visible.
