class Grid {
  constructor(cellsPerDimension, worldCoordinates) {      
    this.worldCoordinates = worldCoordinates;

    this.worldWidth = worldCoordinates.x_max - worldCoordinates.x_min;
    this.worldDepth = worldCoordinates.y_max - worldCoordinates.y_min;
    this.worldHeight = worldCoordinates.z_max - worldCoordinates.z_min;

    this.worldCenter_x = worldCoordinates.x_min + this.worldWidth/2;
    this.worldCenter_y = worldCoordinates.y_min + this.worldDepth/2;
    this.worldCenter_z = worldCoordinates.z_min + this.worldHeight/2;

    this.cellWidth = this.worldWidth/cellsPerDimension;
    this.cellDepth = this.worldDepth/cellsPerDimension;
    this.cellHeight = this.worldHeight/cellsPerDimension;

    this.cellsPerDimension = cellsPerDimension;
    this.cells = [];

    for(let i = 0; i < cellsPerDimension; i++){
      this.cells.push([]); // x dimension
      for(let j = 0; j < cellsPerDimension; j++){
        this.cells[i].push([]); // y dimension
        for(let k = 0; k < cellsPerDimension; k++){
          this.cells[i][j].push(new Cell()); // z dimension
        }
      }
    }
  }

  // maps a boid to a cell, returning a shallow copy of the cell that the
  // given boid is currently in
  addressBoid(boid) {
    // cells will be counted from x_min, y_min, z_min. Order is x, y, z
    return this.cells
    [parseInt((boid.position[0] - this.worldCoordinates.x_min) / this.cellWidth)]
    [parseInt((boid.position[1] - this.worldCoordinates.y_min) / this.cellDepth)]
    [parseInt((boid.position[2] - this.worldCoordinates.z_min) / this.cellHeight)];
  }
}