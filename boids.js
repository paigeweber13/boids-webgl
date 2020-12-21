/* ------------- globals ------------- */
// html object and opengl object
let canvas;
let gl;

// matrices
let M_model_transform;
let M_world_to_ndc;
let M_projection;
let M_camera;
let M_world_rotation;

// buffers
let vBuffer, cBuffer;
let iBufferCube, iBufferWireframeCube, iBufferTetrahedron;

// other webGL things
let vColor;
let program;
let vertexColors = [];

let theta = Math.PI / 8;
const THETA_STEP = Math.PI / 512;

// coordinate system
const WORLD_COORDINATES = {
  x_min: -500,
  x_max:  500,
  y_min: -500,
  y_max:  500,
  z_min: -500,
  z_max:  500,
}

/* world boundaries */
const WORLD_WIDTH = WORLD_COORDINATES.x_max - WORLD_COORDINATES.x_min;
const WORLD_DEPTH = WORLD_COORDINATES.y_max - WORLD_COORDINATES.y_min;
const WORLD_HEIGHT = WORLD_COORDINATES.z_max - WORLD_COORDINATES.z_min;

const WORLD_CENTER_X = WORLD_COORDINATES.x_min + WORLD_WIDTH/2;
const WORLD_CENTER_Y = WORLD_COORDINATES.y_min + WORLD_DEPTH/2;
const WORLD_CENTER_Z = WORLD_COORDINATES.z_min + WORLD_HEIGHT/2;

const WIDTH_IN_CELLS = 10;

// just the average of the 3 dimensions
const WORLD_SIZE = (WORLD_WIDTH + WORLD_DEPTH + WORLD_HEIGHT) / 3;

/* boid things */
let boids = [];
let grid = new Grid(WIDTH_IN_CELLS, WORLD_COORDINATES);
const NUM_BOIDS = 600;

const BOID_SIGHT_DISTANCE = WORLD_SIZE/15;
const MINIMUM_DISTANCE = BOID_SIGHT_DISTANCE/10;
const BOID_SIZE = WORLD_SIZE/128;
const BOID_MAX_SPEED = WORLD_SIZE/200;
const REFLECT_THRESHOLD = WORLD_SIZE * 0.10;

/* other simulation stuff */
let isWorldRotating = false;
let isPaused = false;

/* ------------- init ------------- */
window.onload = function init() {
  // --- INIT OPENGL --- //
  // get the canvas handle from the document's DOM
  canvas = document.getElementById("gl-canvas");

  // initialize webgl
  gl = WebGLUtils.setupWebGL(canvas, null);

  // check for errors
  if (!gl) {
    alert("WebGL isn't available");
  }

  // enable depth checking for proper rendering!
  gl.enable(gl.DEPTH_TEST);

  // let background = colors['Pale Spring Bud'];
  // let background = colors['Champagne'];
  let background = colors['Dark Liver'];
  gl.clearColor(background[0], background[1], background[2], background[3]);

  //  Load shaders -- all work done in init_shaders.js
  program = initShaders(gl, "vertex-shader", "fragment-shader");

  // make this the current shader program
  gl.useProgram(program);

  // set viewport
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Get a handle to transform matrices
  M_model_transform = gl.getUniformLocation(program, "M_model_transform");
  M_projection = gl.getUniformLocation(program, "M_projection");
  M_camera = gl.getUniformLocation(program, "M_camera")
  M_world_to_ndc = gl.getUniformLocation(program, "M_world_to_ndc");
  M_world_rotation = gl.getUniformLocation(program, "M_world_rotation");

  // world rotation starts disabled... set to initial value
    gl.uniformMatrix4fv(M_world_rotation, false, flatten(rotate(theta, 'z')));

  // create a vertex buffer - this will hold all vertices
  vBuffer = gl.createBuffer();

  // index buffer
  iBufferCube = gl.createBuffer();
  iBufferWireframeCube = gl.createBuffer();
  iBufferTetrahedron = gl.createBuffer();

  // color buffer
  cBuffer = gl.createBuffer();

  setVertices();
  setWorldCoordinates();

  setListeners();

  createBoids();

  setCamera();
  render();
};

/* ------------- main render loop ------------- */
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // bind iBufferCube as index buffer
  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferCube);
  // bind cBuffer as array buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);

  doWorldRotation();
  updateBoids();
  drawObjects();

  if(!isPaused){
    requestAnimFrame(render);
  }
}

function forceScale(distance, idealDistance) {
  return (distance-idealDistance);
}

/* ------------ boid things ------------- */
function updateBoids() {

  for (let boid of boids){
    boid.doTimeStep();

    // update own cell
    let myCell = grid.addressBoid(boid);

    if (myCell.id != boid.mostRecentCellId) {
      // then remove from old cell and add to new
      grid.cellsById[boid.mostRecentCellId].removeBoid(boid);
      myCell.addBoid(boid);
    }

    let neighborAverageVelocity = [0, 0, 0];
    let neighborAveragePosition = [0, 0, 0];

    // this function also checks if boid can see the neighbor
    let neighbors = grid.neighbors(boid, BOID_SIGHT_DISTANCE);
    let numNeighbors = 0;

    for (let otherBoid of neighbors) {
      if(boid.id !== otherBoid.id) {
        let thisDistance = distance(boid.position, otherBoid.position);

        if (thisDistance < BOID_SIGHT_DISTANCE) {
          numNeighbors++;
          // console.log("thisDistance       : ", thisDistance);
          // console.log("BOID_SIGHT_DISTANCE: ", BOID_SIGHT_DISTANCE);
          if (thisDistance < MINIMUM_DISTANCE) {
            separation(boid, otherBoid);
          }

          // ---------- calculate average velocity and position ---------- //
          // neighborAveragePosition = add(neighborAveragePosition, otherBoid.position);
          // neighborAverageVelocity = add(neighborAverageVelocity, otherBoid.velocity);
          increaseArray(neighborAveragePosition, otherBoid.position);
          increaseArray(neighborAverageVelocity, otherBoid.velocity);
        }
      }
    }

    if(numNeighbors > 0){
      neighborAveragePosition = scalarMultiply(neighborAveragePosition, 1/numNeighbors);
      neighborAverageVelocity = scalarMultiply(neighborAverageVelocity, 1/numNeighbors);

      cohesion(boid, neighborAveragePosition);
      alignment(boid, neighborAverageVelocity);
    }

    doWorldBoundaries(boid);
  }

}

function alignment(boid, neighborAverageVelocity){
  // ---------- alignment ---------- //
  // find "steering": diff between my velocity and average velocity

  const FORCE_SCALE_ALIGNMENT = 0.1;
  thisForce = scalarMultiply(
    subtract(neighborAverageVelocity, boid.velocity), 
    FORCE_SCALE_ALIGNMENT
  );
  boid.applyForce(thisForce);

  // console.log("ALIGNMENT: applying force ", thisForce);
}

function cohesion(boid, neighborAveragePosition){
  // ---------- cohesion ---------- //
  // add force to move towards average position 
  // (cohesion/alignment)

  const FORCE_SCALE_COHESION = 0.01;
  let thisForce = scalarMultiply(
    subtract(neighborAveragePosition, boid.position), 
    // subtract(boid.position, neighborAveragePosition), 
    FORCE_SCALE_COHESION
  );
  // console.log("cohesion force for boid ", boid.id, ": ", thisForce);
  boid.applyForce(thisForce);

  // console.log("COHESION: applying force ", thisForce);
}

function separation(boid, otherBoid){
  // ---------- separation ---------- //
  // separation first: if distance less than minimum, force exactly 
  // away from otherBoid

  const FORCE_SCALE_SEPARATION = 0.1;
  let thisForce = scalarMultiply(
    subtract(boid.position, otherBoid.position), 
    FORCE_SCALE_SEPARATION
  );

  boid.applyForce(thisForce);

  // console.log("SEPARATION: applying force ", thisForce);

  // let thisForce = scalarMultiply(
  //   subtract(boid.position, otherBoid.position), 
  //   forceScale(thisDistance, MINIMUM_DISTANCE)
  // );
  // boid.applyForce(thisForce);
}

function doWorldBoundaries(boid){
  const BOUNDARY_FORCE = BOID_MAX_SPEED/10;
  const BOUNDARY_THRESHOLD = WORLD_SIZE * 0.15;

  // world boundaries exert a force on each boid
  if(boid.position[0] + BOUNDARY_THRESHOLD > WORLD_COORDINATES.x_max) { 
    boid.applyForce([-BOUNDARY_FORCE, 0, 0]);
  }
  else if(boid.position[0] - BOUNDARY_THRESHOLD < WORLD_COORDINATES.x_min) { 
    boid.applyForce([BOUNDARY_FORCE, 0, 0]);
  }

  if(boid.position[1] + BOUNDARY_THRESHOLD > WORLD_COORDINATES.y_max) { 
    boid.applyForce([0, -BOUNDARY_FORCE, 0]);
  }
  else if(boid.position[1] - BOUNDARY_THRESHOLD < WORLD_COORDINATES.y_min) { 
    boid.applyForce([0, BOUNDARY_FORCE, 0]);
  }

  if(boid.position[2] + BOUNDARY_THRESHOLD > WORLD_COORDINATES.z_max) { 
    boid.applyForce([0, 0, -BOUNDARY_FORCE]);
  }
  else if(boid.position[2] - BOUNDARY_THRESHOLD < WORLD_COORDINATES.z_min) { 
    boid.applyForce([0, 0, BOUNDARY_FORCE]);
  }

  // reflect boid if it gets too close so that it doesn't go out of bounds
  if(boid.position[0] + REFLECT_THRESHOLD > WORLD_COORDINATES.x_max) {
    boid.velocity[0] = -Math.abs(boid.velocity[0]);
  }
  else if(boid.position[0] - REFLECT_THRESHOLD < WORLD_COORDINATES.x_min) {
    boid.velocity[0] = Math.abs(boid.velocity[0]);
  }

  if(boid.position[1] + REFLECT_THRESHOLD > WORLD_COORDINATES.y_max) {
    boid.velocity[1] = -Math.abs(boid.velocity[1]);
  }
  else if(boid.position[1] - REFLECT_THRESHOLD < WORLD_COORDINATES.y_min) {
    boid.velocity[1] = Math.abs(boid.velocity[1]);
  }

  if(boid.position[2] + REFLECT_THRESHOLD > WORLD_COORDINATES.z_max) {
    boid.velocity[2] = -Math.abs(boid.velocity[2]);
  }
  else if(boid.position[2] - REFLECT_THRESHOLD < WORLD_COORDINATES.z_min) {
    boid.velocity[2] = Math.abs(boid.velocity[2]);
  }
}

function createBoids() {
  // portion of the world to take up. A fullness of 1.0 will use all the 
  // world, whereas a fullness of 0.1 will use one tenth of the world

  const FULLNESS = 1.0;

  // because of numerical stability issues, we only create inside the
  // reflect threshold. If we use the full world coordinate system, some
  // positions will exceed world boundaries due to rounding errors.
  let SMALL_WIDTH = WORLD_WIDTH - REFLECT_THRESHOLD;
  let SMALL_DEPTH = WORLD_DEPTH - REFLECT_THRESHOLD;
  let SMALL_HEIGHT = WORLD_HEIGHT - REFLECT_THRESHOLD;

  for (let i = 0; i < NUM_BOIDS; i++){
    let this_position = [
      WORLD_CENTER_X - SMALL_WIDTH  * FULLNESS/2 + Math.random() * SMALL_WIDTH  * FULLNESS,
      WORLD_CENTER_Y - SMALL_DEPTH  * FULLNESS/2 + Math.random() * SMALL_DEPTH  * FULLNESS,
      WORLD_CENTER_Z - SMALL_HEIGHT * FULLNESS/2 + Math.random() * SMALL_HEIGHT * FULLNESS

      // WORLD_COORDINATES.x_min + Math.random() * WORLD_WIDTH,
      // WORLD_COORDINATES.y_min + Math.random() * WORLD_DEPTH,
      // WORLD_COORDINATES.z_min + Math.random() * WORLD_HEIGHT,
    ];
    let this_velocity = [
      -BOID_MAX_SPEED + Math.random() * 2 * BOID_MAX_SPEED,
      -BOID_MAX_SPEED + Math.random() * 2 * BOID_MAX_SPEED,
      -BOID_MAX_SPEED + Math.random() * 2 * BOID_MAX_SPEED,
    ];

    let thisBoid = new Boid(i, this_position, this_velocity);
    let thisCell = grid.addressBoid(thisBoid);

    thisBoid.mostRecentCellId = thisCell.id;
    thisCell.addBoid(thisBoid);

    boids.push(thisBoid);
  }
}

/* ------------ drawing ------------- */

// actually sets camera and projection
function setCamera() {
  let fov = Math.PI/2000;
  let projection = perspectiveProjectionFov(fov, fov, 1, 1000)
  gl.uniformMatrix4fv(M_projection, false, flatten(projection));

  let eyeVector = vec3(
    WORLD_CENTER_X,
    WORLD_CENTER_Y + WORLD_DEPTH * -2.2,
    WORLD_CENTER_Z + WORLD_HEIGHT * 0.2
  );
  let lookAtVector = vec3(
    WORLD_CENTER_X,
    WORLD_CENTER_Y,
    WORLD_CENTER_Z - WORLD_HEIGHT * 0.1
  );
  let upVector = vec3(0, 0, 1);

  let camera = lookAt(eyeVector, lookAtVector, upVector);
  gl.uniformMatrix4fv(M_camera, false, flatten(camera));
}

function setWorldCoordinates() {
  gl.uniformMatrix4fv(M_world_to_ndc, false,
    flatten(worldToNormalized(WORLD_COORDINATES)));
}

function drawObjects() {
  let transform;
  let rotate_transform;
  let theta, phi;
  let normalized_velocity;

  /* ----- draw world boundaries ----- */
  transform = mult(
    // move to center of world: cube vertices are such that center of cube
    // is the origin of the cube
    translate(WORLD_CENTER_X, WORLD_CENTER_Y, WORLD_CENTER_Z),

    // cube width is 2, so we want to scale by (world_size/2)
    scale(
      (WORLD_WIDTH-REFLECT_THRESHOLD)/2,
      (WORLD_DEPTH-REFLECT_THRESHOLD)/2,
      (WORLD_HEIGHT-REFLECT_THRESHOLD)/2
    )
  );
  drawWireframeCube(transform);

  /* ----- draw boids ----- */
  // TODO: move scale_transform to GPU for faster computation
  const scale_transform = scale(
    BOID_SIZE, 
    BOID_SIZE, 
    BOID_SIZE
  );

  for (let boid of boids) {
    // here I tried to get them pointing in the right direction, didn't work.
    // Going to try again later.
    /*
    // we use slice to make a deep copy of the array
    normalized_velocity = normalize(boid.velocity.slice());

    theta = Math.acos(normalized_velocity[2]);
    phi = Math.atan2(normalized_velocity[1], normalized_velocity[0]);

    rotate_transform = mult(rotate_z(phi), rotate_y(-theta))

    transform = mult(rotate_transform, scale_transform)
    */
    transform = mult(translate(boid.position[0], boid.position[1], boid.position[2]), 
      scale_transform);
    drawTetrahedron(transform);
  }
}

function doWorldRotation() {
  if(isWorldRotating){
    theta += THETA_STEP;
    if (theta >= 2 * Math.PI) {
      theta = 0;
    }

    gl.uniformMatrix4fv(M_world_rotation, false, flatten(rotate(theta, 'z')));
  }
}

/* ------------- geometry and colors -------------
 * mostly low-level graphics stuff
 */
function setVertices() {
  /* vertices and indices for cube taken from "WebGL Programming Guide" by
   * Kouichi Matsuda and Rodger Lee, copyright Pearson Education 2013
   */

  // for an equilateral triangle with sides of length 1, height is about 0.8661
  // naming convention: "t_b_h" == tetrahedron_base_height
  const t_b_h = 0.8661;
  const t_h = 1.5;
  const t_b_w = 1.0;

  const VERTICES = new Float32Array([
    // cube vertices
    1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, // v0-v1-v1-v3 front
    1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, // v0-v3-v4-v5 right
    1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, // v1-v6-v7-v1 left
    -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // v7-v4-v3-v1 down
    1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0,  // v4-v7-v6-v5 back

    // tetrahedron vertices
    -t_b_w/2, -t_h/2, -t_b_h/2, // base: bottom left point
    t_b_w/2, -t_h/2, -t_b_h/2, // base: bottom right point
    0, -t_h/2, t_b_h/2, // base: top point
    0, t_h/2, 0, // pointy "nose" of the tetrahedron
  ]);

  const INDICES_CUBE = new Uint8Array([
    0, 1, 2, 0, 2, 3,    // front
    4, 5, 6, 4, 6, 7,    // right
    8, 9, 10, 8, 10, 11,    // up
    12, 13, 14, 12, 14, 15,    // left
    16, 17, 18, 16, 18, 19,    // down
    20, 21, 22, 20, 22, 23     // back
  ]);

  const INDICES_WIREFRAME_CUBE = new Uint8Array([
    // front face
    0, 1, 
    1, 2, 
    2, 3, 
    3, 0,

    // back face
    20, 21, 
    21, 22, 
    22, 23,
    23, 20,

    // 4 lines connecting faces
    0, 23,
    1, 22,
    2, 21,
    3, 20,
  ]);

  const INDICES_TETRAHEDRON = new Uint8Array([
    24, 25, 26, // rear face (base)
    24, 26, 27, // left side face
    26, 25, 27, // right side face
    25, 24, 27, // bottom side face
  ]);

  // copy vertex info to gpu
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);
  let vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // create all the index buffers and populate them
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferCube);
  // this call to bufferData is how webGL knows that this is the index buffer
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, INDICES_CUBE, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferWireframeCube);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, INDICES_WIREFRAME_CUBE, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferTetrahedron);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, INDICES_TETRAHEDRON, gl.STATIC_DRAW);

  for (let i = 0; i < 72; i++) {
    vertexColors.push(colors["Salmon Pink"]);
  }

  for (let i = 0; i < 72; i++) {
    vertexColors.push(colors["Peach Puff"]);
  }

  for (let i = 0; i < 72; i++) {
    vertexColors.push(colors["Pale Spring Bud"]);
  }

  for (let i = 0; i < 72; i++) {
    vertexColors.push(colors.purple);
  }

  for (let i = 0; i < 72; i++) {
    vertexColors.push(colors.red);
  }

  // send color data to GPU
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

  vColor = gl.getAttribLocation(program, "vColor");
  gl.enableVertexAttribArray(vColor);

}

function drawCube(transform, color) {
  // bind cube buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferCube);

  // copy transform matrix to GPU
  gl.uniformMatrix4fv(M_model_transform, false, flatten(transform));

  // variables we need later
  const STEP = 1152;
  let color_offset = STEP * STEP;

  // recognize user input for color
  switch (color) {
    case "Salmon Pink":
      color_offset = 0 * STEP;
      break;
    case "Peach Puff":
      color_offset = 1 * STEP;
      break;
    case "Pale Spring Bud":
      color_offset = 2 * STEP;
      break;
    case "purple":
      color_offset = 3 * STEP;
      break;
    case "red":
      color_offset = 4 * STEP;
      break;
  }

  // set offset to select color
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, color_offset);

  // draw cube
  // gl.drawElements(gl.LINE_STRIP, 36, gl.UNSIGNED_BYTE, 0);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
}

function drawWireframeCube(transform, color) {
  // bind cube buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferWireframeCube);

  // copy transform matrix to GPU
  gl.uniformMatrix4fv(M_model_transform, false, flatten(transform));

  // set offset to select color
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 1152);

  // draw cube
  gl.drawElements(gl.LINES, 24, gl.UNSIGNED_BYTE, 0);
}

function drawTetrahedron(transform) {
  // bind cube buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferTetrahedron);

  // copy transform matrix to GPU
  gl.uniformMatrix4fv(M_model_transform, false, flatten(transform));

  // set offset to select color
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);

  // draw cube
  gl.drawElements(gl.TRIANGLES, 12, gl.UNSIGNED_BYTE, 0);
}

/* ------------- helper functions ------------- */


/* Color things */
function hexToRgb(hex) {
  // inspired by this stackoverflow answer: https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb#5624139
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  if(result[4] !== undefined) {
    return [
      parseInt(result[1], 16) / 255.0,
      parseInt(result[2], 16) / 255.0,
      parseInt(result[3], 16) / 255.0,
      parseInt(result[3], 16) / 255.0,
    ];
  }
  else {
    return result ? [
      parseInt(result[1], 16) / 255.0,
      parseInt(result[2], 16) / 255.0,
      parseInt(result[3], 16) / 255.0,
      1.0
    ] : null;
  }
}

let colors = {
  white: [1, 1, 1, 1],
  black: [0, 0, 0, 1],

  // palette created by me: https://coolors.co/bce784-5dd39e-348aa7-ba8aa7-513b56
  yellow_green_crayola: hexToRgb('#BCE784'),
  medium_aquamarine: hexToRgb('#5DD39E'),
  blue_munsell: hexToRgb('#348AA7'),
  opera_mauve: hexToRgb('#BA8AA7'),
  english_violet: hexToRgb('#513B56'),


  // palette created by me: https://coolors.co/f1e4e8-e2dcde-ceb1be-b97375-2d2d34
  "Lavender Blush": hexToRgb("#f1e4e8"),
  "Gainsboro": hexToRgb("#e2dcde"),
  "Thistle": hexToRgb("#ceb1be"),
  "Old Rose": hexToRgb("#b97375"),
  "Raisin Black": hexToRgb("#2d2d34"),

  // palette: https://coolors.co/b8d8ba-d9dbbc-fcddbc-ef959d-69585f
  "Turquoise Green": hexToRgb("#b8d8ba"),
  "Pale Spring Bud": hexToRgb("#d9dbbc"),
  "Peach Puff": hexToRgb("#fcddbc"),
  "Peach Puff Transparent": hexToRgb("#fcddbc80"),
  "Salmon Pink": hexToRgb("#ef959d"),
  "Dark Liver": hexToRgb("#69585f"),
  "Mint Cream": hexToRgb("#E6EFED"),
  "Champagne": hexToRgb("#F2E5CF"),

  // rainbow
  red: hexToRgb('#e6261f'),
  orange: hexToRgb('#eb7532'),
  yellow: hexToRgb('#f7d038'),
  green: hexToRgb('#a3e048'),
  teal: hexToRgb('#49da9a'),
  blue_light: hexToRgb('#34bbe6'),
  blue_dark: hexToRgb('#4355db'),
  purple: hexToRgb('#d23be7'),
}
// colors["Salmon Pink"][3] = 0.5

/* UI */
function setListeners() {
  document.getElementById("reset").onclick = resetSimulation;

  document.getElementById("toggle-rotation").onclick = () => {
    isWorldRotating = !isWorldRotating;
  };

  document.getElementById("play-pause").onclick = () => {
    isPaused = !isPaused;

    if(!isPaused){
      render();
    }
  };
}

function resetSimulation() {
  boids = [];
  createBoids();

  // render one frame if we're paused
  if(isPaused){
    render();
  }
}
