class Boid {
  /*
   * each of position, velocity, and acceleration must have the following 
   * structure:
   * 
   * [x_component: Number, y_component: Number, z_component: Number]
   */
  constructor(id, position, velocity) {
    this.id = id;
    this.position = position;
    this.velocity = velocity;
    this.initialVelocity = length(this.velocity);

    this.mostRecentCellId = undefined;

    // removed: color is now same for all boids
    /*
    this.modelColor = [
      Math.random(),
      Math.random(),
      Math.random(),
      1.0];
     */
  }

  doTimeStep() {
    // keeps the boids moving. Not strictly necessary (`separation()` adds
    // enough entropy to the system that it can keep moving) but it keeps
    // things at a good pace

    let speed = length(this.velocity);
    if (speed < this.initialVelocity) {
      this.velocity = scalarMultiply(this.velocity, 1.2);
    }

    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];
    this.position[2] += this.velocity[2];
  }

  applyForce(forceVector) {
    this.velocity = add(this.velocity, forceVector);
  }
}
