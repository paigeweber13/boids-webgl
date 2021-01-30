class Grid {
  constructor(cellsPerDimension, worldCoordinates) {
    this.worldCoordinates = worldCoordinates;

    this.worldWidth = worldCoordinates.x_max - worldCoordinates.x_min;
    this.worldDepth = worldCoordinates.y_max - worldCoordinates.y_min;
    this.worldHeight = worldCoordinates.z_max - worldCoordinates.z_min;

    this.cellWidth = this.worldWidth / cellsPerDimension;
    this.cellDepth = this.worldDepth / cellsPerDimension;
    this.cellHeight = this.worldHeight / cellsPerDimension;
    console.log("cell dimensions: ", [this.cellWidth, this.cellDepth, this.cellHeight]);

    this.cellsPerDimension = cellsPerDimension;
    this.cells = [];
    this.cellsById = {};

    for (let i = 0; i < cellsPerDimension; i++) {
      this.cells.push([]); // x dimension
      for (let j = 0; j < cellsPerDimension; j++) {
        this.cells[i].push([]); // y dimension
        for (let k = 0; k < cellsPerDimension; k++) {
          let newCell = new Cell(i * cellsPerDimension * cellsPerDimension + j * cellsPerDimension + k);

          this.cells[i][j].push(newCell); // z dimension
          this.cellsById[newCell.id] = newCell;
        }
      }
    }
  }

  // maps a boid to a cell, returning a shallow copy of the cell that the
  // given boid is currently in
  addressBoid(boid) {
    // cells will be counted from x_min, y_min, z_min. Order is x, y, z
    let x = Math.floor((boid.position[0] - this.worldCoordinates.x_min) / this.cellWidth);
    let y = Math.floor((boid.position[1] - this.worldCoordinates.y_min) / this.cellDepth);
    let z = Math.floor((boid.position[2] - this.worldCoordinates.z_min) / this.cellHeight);

    if (x < 0 || x >= this.cellsPerDimension ||
      y < 0 || y >= this.cellsPerDimension ||
      z < 0 || z >= this.cellsPerDimension) {
      return undefined;
    }

    // assumes boid is in-bounds
    return this.cells[x][y][z];
  }

  getCellIndex(boidPosition) {
    // returns undefined if out of bounds
    let x = Math.floor((boidPosition[0] - this.worldCoordinates.x_min) / this.cellWidth);
    let y = Math.floor((boidPosition[1] - this.worldCoordinates.y_min) / this.cellDepth);
    let z = Math.floor((boidPosition[2] - this.worldCoordinates.z_min) / this.cellHeight);

    return [x, y, z];
  }

  visibleCells(boid, sightDistance) {
    // these points try to cover the edge of the distance seen by the boid.
    // Notice that this volume is cubic, whereas boid vision is spherical.
    // It's not a perfect model but it's pretty good and much easier to code.
    const POSITION_DELTAS = [
      [-sightDistance, -sightDistance, -sightDistance],
      [-sightDistance, -sightDistance, sightDistance],

      [-sightDistance, sightDistance, -sightDistance],
      [-sightDistance, sightDistance, sightDistance],

      [sightDistance, -sightDistance, -sightDistance],
      [sightDistance, -sightDistance, sightDistance],

      [sightDistance, sightDistance, -sightDistance],
      [sightDistance, sightDistance, sightDistance],
    ];

    let minIndices = [this.cellsPerDimension, this.cellsPerDimension, this.cellsPerDimension];
    let maxIndices = [0, 0, 0];

    for (let delta of POSITION_DELTAS) {
      let thisCellIndex = this.getCellIndex([
        boid.position[0] + delta[0],
        boid.position[1] + delta[1],
        boid.position[2] + delta[2],
      ]);

      if (thisCellIndex !== undefined) {
        // get maximum and minimum: we will fill in the middle

        for (let i = 0; i < 3; i++) {
          if (thisCellIndex[i] < minIndices[i]) {
            minIndices[i] = thisCellIndex[i];
          } else if (thisCellIndex[i] > maxIndices[i]) {
            maxIndices[i] = thisCellIndex[i];
          }
        }
      }
    }

    // fix anything that's out of bounds
    for (let i = 0; i < 3; i++) {
      if (minIndices[i] < 0) minIndices[i] = 0;

      if (maxIndices[i] > this.cellsPerDimension - 1) {
        maxIndices[i] = this.cellsPerDimension - 1;
      }
    }

    let visibleCells = [];

    // fill in the middle. This will also get the current boid's cell
    for (let i = minIndices[0]; i < maxIndices[0]; i++) {
      for (let j = minIndices[1]; j < maxIndices[1]; j++) {
        for (let k = minIndices[2]; k < maxIndices[2]; k++) {
          visibleCells.push(this.cells[i][j][k]);
        }
      }
    }

    return visibleCells;
  }
}
