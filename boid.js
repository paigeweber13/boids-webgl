class Boid {
  /*
   * each of position, velocity, and acceleration must have the following 
   * structure:
   * 
   * [x_component: Number, y_component: Number, z_component: Number]
   */
  constructor(position, velocity, acceleration){
    this.position = position;
    this.velocity = velocity;
    this.acceleration = acceleration;
  }

  doTimeStep(){
    this.velocity[0] += this.acceleration[0];
    this.velocity[1] += this.acceleration[1];
    this.velocity[2] += this.acceleration[2];

    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];
    this.position[2] += this.velocity[2];
  }

  applyForce(forceVector){
    this.acceleration = add(this.acceleration, forceVector);
  }
}