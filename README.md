# boids-webgl
An implementation of Craig Reynolds's "Boids" program

# TODO
- [x] fix camera: center on world
- [x] add grid system into simulation
- [ ] fix speed problems with grid system
- [ ] add second, close-up camera
- [ ] average color of boids in nearby cells
- [ ] point boids in the right direction

# Optimizations:
- Replaced `add()` from `MV.js` with an increment function that edits in place
- Uses grid system so that boids only check distance between boids in cells
  it can see
