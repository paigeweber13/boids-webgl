class Boid {
  /*
   * each of position, velocity, and acceleration must have the following 
   * structure:
   * 
   * {
   *   x: Number
   *   y: Number
   *   z: Number
   * }
   */
  constructor(position, velocity, acceleration){
    this.position = position;
    this.velocity = velocity;
    this.acceleration = acceleration;
  }
}