/* ------------- globals ------------- */
// html object and opengl object
let canvas;
let gl;

// matrices
let M_model;
let M_projection;
let M_camera;

// buffers
let vBuffer, cBuffer;
let iBufferCube, iBufferTetrahedron;

// other webGL things
let vColor;
let program;
let vertexColors = [];

let theta = 0;
const THETA_STEP = Math.PI / 512;

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
  M_model = gl.getUniformLocation(program, "M_model");
  M_projection = gl.getUniformLocation(program, "M_projection");
  M_camera = gl.getUniformLocation(program, "M_camera")

  // create a vertex buffer - this will hold all vertices
  vBuffer = gl.createBuffer();

  // index buffer
  iBufferCube = gl.createBuffer();
  iBufferTetrahedron = gl.createBuffer();

  // color buffer
  cBuffer = gl.createBuffer();

  setVertices();

  resetSliders();
  setListeners();

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

  doRotation();
  drawObjects();

  requestAnimFrame(render);
}

/* ------------ drawing ------------- */

// actually sets camera and projection
function setCamera() {
  let projectionDynamic = perspectiveProjection(1, 1, 1, 5);
  gl.uniformMatrix4fv(M_projection, false, flatten(projectionDynamic));

  let eyeVector = vec3(1.0, -2.5, 1.5)
  let lookAtVector = vec3(0, 0, 0);
  let upVector = vec3(0, 0, 1);
  let cameraLeftSide = lookAt(eyeVector, lookAtVector, upVector);
  gl.uniformMatrix4fv(M_camera, false, flatten(cameraLeftSide));
}

function drawObjects() {
  let transform;

  /* cube 1 - main cube */
  transform = mult(translate(0.0, 0.0, 0.0), scale(0.5, 0.5, 0.5));
  transform = mult(rotate(theta, 'z'), transform);
  drawCube(transform, "Pale Spring Bud");

  /* cube 2 - smaller, on top */
  transform = mult(translate(0.0, 0.0, 0.5), scale(0.3, 0.3, 0.3));
  transform = mult(rotate(theta, 'z'), transform);
  drawCube(transform, "Peach Puff");

  /* tetrahedron - to the right */
  transform = mult(translate(1.0, 0.0, 0.0), scale(0.3, 0.3, 0.3));
  transform = mult(rotate(theta, 'z'), transform);
  drawTetrahedron(transform);
}

function doRotation() {
  theta += THETA_STEP;
  if (theta >= 2 * Math.PI) {
    theta = 0;
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
  gl.uniformMatrix4fv(M_model, false, flatten(transform));

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
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
}

function drawTetrahedron(transform) {
  // bind cube buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferTetrahedron);

  // copy transform matrix to GPU
  gl.uniformMatrix4fv(M_model, false, flatten(transform));

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

  document.getElementById("reset").onclick = resetSliders;
}

function resetSliders() {
  // set defaults

  setSlidersToVariable();
}

function setSlidersToVariable() {
}
