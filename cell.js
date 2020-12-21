class Cell {
  constructor(id){
    this.id = id;

    this.boidsInCell = [];

    // map of id -> index of boid in "boidsInCell"
    this.indexTracker = {};

    this.color = [0, 0, 0, 0];
  }

  addBoid(boid) {
    this.boidsInCell.push(boid);
    this.indexTracker[boid.id] = this.boidsInCell.length - 1;
  }

  removeBoid(boid) {
    this.boidsInCell.splice(this.indexTracker[boid.id], 1);
    delete this.indexTracker[boid.id];
  }
}