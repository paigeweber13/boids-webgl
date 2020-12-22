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
let vBuffer;
let uColor;
let iBufferCube, iBufferWireframeCube, iBufferTetrahedron;

// other webGL things
// let vColor;
let program;
// let vertexColors;

let theta = Math.PI / 8;
const THETA_STEP = Math.PI / 512;

// coordinate system
const WORLD_COORDINATES = {
  x_min: -50,
  x_max:  50,
  y_min: -50,
  y_max:  50,
  z_min: -50,
  z_max:  50,
}

/* world boundaries */
const WORLD_WIDTH = WORLD_COORDINATES.x_max - WORLD_COORDINATES.x_min;
const WORLD_DEPTH = WORLD_COORDINATES.y_max - WORLD_COORDINATES.y_min;
const WORLD_HEIGHT = WORLD_COORDINATES.z_max - WORLD_COORDINATES.z_min;

const WORLD_CENTER_X = WORLD_COORDINATES.x_min + WORLD_WIDTH/2;
const WORLD_CENTER_Y = WORLD_COORDINATES.y_min + WORLD_DEPTH/2;
const WORLD_CENTER_Z = WORLD_COORDINATES.z_min + WORLD_HEIGHT/2;

// just the average of the 3 dimensions
const WORLD_SIZE = (WORLD_WIDTH + WORLD_DEPTH + WORLD_HEIGHT) / 3;

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

  uColor = gl.getUniformLocation(program, "vColor");

  // world rotation starts disabled... set to initial value
  gl.uniformMatrix4fv(M_world_rotation, false, flatten(rotate(theta, 'z')));

  // create a vertex buffer - this will hold all vertices
  vBuffer = gl.createBuffer();

  // index buffer
  iBufferCube = gl.createBuffer();
  iBufferWireframeCube = gl.createBuffer();
  iBufferTetrahedron = gl.createBuffer();

  // color buffer
  // cBuffer = gl.createBuffer();

  setVertices();
  setWorldCoordinates();

  setListeners();

  setCamera();
  render();
};

/* ------------- main render loop ------------- */
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  doWorldRotation();
  drawObjects();

  if(!isPaused){
    requestAnimFrame(render);

    /*
    const DELAY = 15;
    setTimeout(
      function () { requestAnimFrame(render); }, DELAY
    );
     */
  }
}

/* ------------ drawing ------------- */

// actually sets camera and projection
function setCamera() {
  let fov = Math.PI/200;
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

  /* ----- draw world boundaries ----- */
  transform = mult(
    // move to center of world: cube vertices are such that center of cube
    // is the origin of the cube
    translate(WORLD_CENTER_X, WORLD_CENTER_Y, WORLD_CENTER_Z),

    // cube width is 2, so we want to scale by (world_size/2)
    scale(WORLD_WIDTH/2, WORLD_DEPTH/2, WORLD_HEIGHT/2)
  );
  drawWireframeCube(transform);


  transform = mult(
    translate(WORLD_CENTER_X, WORLD_CENTER_Y, WORLD_CENTER_Z),
    scale(WORLD_WIDTH/10, WORLD_DEPTH/10, WORLD_HEIGHT/10)
  );
  drawCube(transform);

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

  const VERTICES = new Float32Array([
    // cube vertices
    1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, // v0-v1-v1-v3 front
    1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, // v0-v3-v4-v5 right
    1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, // v1-v6-v7-v1 left
    -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // v7-v4-v3-v1 down
    1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0,  // v4-v7-v6-v5 back
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

}

function drawWireframeCube(transform) {
  // bind cube buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferWireframeCube);

  // copy transform matrix to GPU
  gl.uniformMatrix4fv(M_model_transform, false, flatten(transform));

  // copy color
  gl.uniform4fv(uColor, colors["Peach Puff"]);

  // draw cube
  gl.drawElements(gl.LINES, 24, gl.UNSIGNED_BYTE, 0);
}

function drawCube(transform) {
  // bind cube buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferCube);

  // copy transform matrix to GPU
  gl.uniformMatrix4fv(M_model_transform, false, flatten(transform));

  // copy color
  gl.uniform4fv(uColor, colors["Old Rose"]);

  // draw cube
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
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
  // render one frame if we're paused
  if(isPaused){
    render();
  }
}
