class Cell {
  constructor(){
    // map of id -> boid object
    this.boidsInCell = {};
  }

  addBoid(boid) {
    this.boidsInCell[boid.id] = boid;
  }

  removeBoid(boid) {
    delete this.boidsInCell[boid.id];
  }

  contains(boid) {
    return this.boidsInCell[boid.id] !== undefined;
  }
}