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

let theta = 0;
const THETA_STEP = Math.PI / 512;

// coordinate system
const WORLD_COORDINATES = {
  x_min: -5,
  x_max:  5,
  y_min: -5,
  y_max:  5,
  z_min: -5,
  z_max:  5,
}

/* world boundaries */
const WORLD_WIDTH = WORLD_COORDINATES.x_max - WORLD_COORDINATES.x_min;
const WORLD_DEPTH = WORLD_COORDINATES.y_max - WORLD_COORDINATES.y_min;
const WORLD_HEIGHT = WORLD_COORDINATES.z_max - WORLD_COORDINATES.z_min;

const WORLD_CENTER_X = WORLD_COORDINATES.x_min + WORLD_WIDTH/2;
const WORLD_CENTER_Y = WORLD_COORDINATES.y_min + WORLD_DEPTH/2;
const WORLD_CENTER_Z = WORLD_COORDINATES.z_min + WORLD_HEIGHT/2;

// boid things
let boids = [];
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

  // world rotation might be disabled... set to identity just in case
  gl.uniformMatrix4fv(M_world_rotation, false, flatten(identity()));

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

/* ------------ boid things ------------- */
function updateBoids() {
  for (boid of boids){
    boid.doTimeStep();

    // if they fly past the boundary, wrap around to other side
    if(boid.position[0] > WORLD_COORDINATES.x_max) { 
      boid.position[0] = WORLD_COORDINATES.x_min 
    }
    else if(boid.position[0] < WORLD_COORDINATES.x_min) { 
      boid.position[0] = WORLD_COORDINATES.x_max 
    }

    if(boid.position[1] > WORLD_COORDINATES.y_max) { 
      boid.position[1] = WORLD_COORDINATES.y_min 
    }
    else if(boid.position[1] < WORLD_COORDINATES.y_min) { 
      boid.position[1] = WORLD_COORDINATES.y_max
    }

    if(boid.position[2] > WORLD_COORDINATES.z_max) { 
      boid.position[2] = WORLD_COORDINATES.z_min 
    }
    else if(boid.position[2] < WORLD_COORDINATES.z_min) { 
      boid.position[2] = WORLD_COORDINATES.z_max
    }
  }
}

function createBoids() {
  const NUM_BOIDS = 100;
  const SPEED_FACTOR = 1/128;

  for(let i = 0; i < NUM_BOIDS; i++){
    let this_position = [
      WORLD_COORDINATES.x_min + Math.random() * WORLD_WIDTH,
      WORLD_COORDINATES.y_min + Math.random() * WORLD_DEPTH,
      WORLD_COORDINATES.z_min + Math.random() * WORLD_HEIGHT,
    ];
    let this_velocity = [
      Math.random() * WORLD_WIDTH  * SPEED_FACTOR,
      Math.random() * WORLD_DEPTH  * SPEED_FACTOR,
      Math.random() * WORLD_HEIGHT * SPEED_FACTOR,
    ];
    let this_acceleration = [
      0,
      0,
      0,
    ];
    boids.push(new Boid(this_position, this_velocity, this_acceleration));
  }
}

/* ------------ drawing ------------- */

// actually sets camera and projection
function setCamera() {
  let fov = Math.PI/24;
  let projection = perspectiveProjectionFov(fov, fov, 1, 1000)
  gl.uniformMatrix4fv(M_projection, false, flatten(projection));

  let eyeVector = vec3(
    WORLD_COORDINATES.x_max + WORLD_WIDTH * 0.2,
    WORLD_COORDINATES.y_min + WORLD_DEPTH * -1.5,
    WORLD_COORDINATES.z_max + WORLD_HEIGHT * 0.2,
  );
  let lookAtVector = vec3(
    WORLD_CENTER_X,
    WORLD_CENTER_Y + WORLD_DEPTH * -0.3,
    WORLD_CENTER_Z
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

  /* ----- draw world boundaries ----- */
  transform = mult(
    // move to center of world: cube vertices are such that center of cube
    // is the origin of the cube
    translate(WORLD_CENTER_X, WORLD_CENTER_Y, WORLD_CENTER_Z),

    // cube width is 2, so we want to scale by (world_size/2)
    scale(WORLD_WIDTH/2, WORLD_DEPTH/2, WORLD_HEIGHT/2)
  );
  drawWireframeCube(transform);

  /* ----- draw boids ----- */
  const SCALE_FACTOR = 1/64;
  const scale_transform = scale(
    WORLD_WIDTH * SCALE_FACTOR, 
    WORLD_DEPTH * SCALE_FACTOR, 
    WORLD_HEIGHT * SCALE_FACTOR
  );

  for (boid of boids) {
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
}
