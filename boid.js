class Boid {
  /*
   * each of position, velocity, and acceleration must have the following 
   * structure:
   * 
   * [x_component: Number, y_component: Number, z_component: Number]
   */
  constructor(id, position, velocity, acceleration){
    this.id = id;
    this.position = position;
    this.velocity = velocity;
    this.acceleration = acceleration;
    this.VELOCITY_MAGNITUDE = length(this.velocity);
  }

  FORCE_DEGRADE_AMOUNT = 1;

  doTimeStep(){
    // if(this.acceleration[0] > 0){
    //   this.acceleration[0] -= this.FORCE_DEGRADE_AMOUNT;
    // }
    // if(this.acceleration[1] > 0){
    //   this.acceleration[1] -= this.FORCE_DEGRADE_AMOUNT;
    // }
    // if(this.acceleration[2] > 0){
    //   this.acceleration[2] -= this.FORCE_DEGRADE_AMOUNT;
    // }

    this.velocity[0] += this.acceleration[0];
    this.velocity[1] += this.acceleration[1];
    this.velocity[2] += this.acceleration[2];

    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];
    this.position[2] += this.velocity[2];

    this.acceleration[0] = 0;
    this.acceleration[1] = 0;
    this.acceleration[2] = 0;

    /* optional: maintains velocity magnitude */
    // this.velocity = scalarMultiply(normalize(this.velocity), this.VELOCITY_MAGNITUDE);
  }

  applyForce(forceVector){
    this.acceleration = add(this.acceleration, forceVector);
  }
}