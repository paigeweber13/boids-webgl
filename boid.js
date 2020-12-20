class Boid {
  /*
   * each of position, velocity, and acceleration must have the following 
   * structure:
   * 
   * [x_component: Number, y_component: Number, z_component: Number]
   */
  constructor(id, position, velocity){
    this.id = id;
    this.position = position;
    this.velocity = velocity;

    this.initialVelocityMagnitude = length(this.velocity);
    this.mostRecentCellId = undefined;
  }

  doTimeStep(){
    if(length(this.velocity) < this.initialVelocityMagnitude) {
      // keep moving
      this.velocity = scalarMultiply(this.velocity, 1.1);
    }

    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];
    this.position[2] += this.velocity[2];
  }

  applyForce(forceVector){
    this.velocity = add(this.velocity, forceVector);
  }
}