<!DOCTYPE html>
<head>
  <meta charset="UTF-8">
  <title>Boids</title>
</head>
<html
    lang="en">

<body>
<div class="container">
  <h1>Boids</h1>

  <div class="row">
    <div class="col-md-9">
      <canvas height="800" id="gl-canvas" width="800">
        Oops ... your browser doesn't support the HTML5 canvas element
      </canvas>
    </div>
    <div class="col-md-3">
      <h2>Simulation Controls</h2>
      <button class="btn btn-secondary" id="play-pause">Play/Pause Simulation
      </button>
      <br><br>
      <button class="btn btn-secondary" id="reset">Reset Simulation</button>
      <br><br>
      <button class="btn btn-secondary" id="toggle-rotation">Toggle World
        Rotation
      </button>


      <h2>Boid Behavior</h2>
      <h3>Presets</h3>
      <button class="btn btn-secondary" id="behavior-fast">Fast</button>
      <button class="btn btn-secondary" id="behavior-slow">Slow</button>


      <h3>Manual Tuning</h3>
      <label class="form-label" for="slider-boid-speed-group">Boid Speed</label>
      <div id="slider-boid-speed-group">
        <p><em>Note: boid speed only takes affect after resetting the
          simulation</em></p>
        <span id="slider-boid-speed-display"></span>
        <input class="form-range" id="slider-boid-speed" max="50.0"
               min="1.00" step="0.01" type="range">
      </div>
      <br>

      <label class="form-label" for="slider-separation-group">Separation</label>
      <div id="slider-separation-group">
        <span id="slider-separation-display"></span>
        <input class="form-range" id="slider-separation" max="1.0"
               min="0.01" step="0.01" type="range">
      </div>
      <br>

      <label class="form-label" for="slider-alignment-group">Alignment</label>
      <div id="slider-alignment-group">
        <span id="slider-alignment-display"></span>
        <input class="form-range" id="slider-alignment" max="1.0"
               min="0.01" step="0.01" type="range">
      </div>
      <br>

      <label class="form-label" for="slider-cohesion-group">Cohesion</label>
      <div id="slider-cohesion-group">
        <span id="slider-cohesion-display"></span>
        <input class="form-range" id="slider-cohesion" max="1.0"
               min="0.01" step="0.01" type="range">
      </div>
      <br>

      <label class="form-label" for="slider-boid-sight-distance-group">boid-sight-distance</label>
      <div id="slider-boid-sight-distance-group">
        <span id="slider-boid-sight-distance-display"></span>
        <input class="form-range" id="slider-boid-sight-distance" max="200"
               min="1" step="0.01" type="range">
      </div>
      <br>

      <label class="form-label" for="slider-boid-min-separation-distance-group">boid-min-separation-distance</label>
      <div id="slider-boid-min-separation-distance-group">
        <span id="slider-boid-min-separation-distance-display"></span>
        <input class="form-range" id="slider-boid-min-separation-distance"
               max="100"
               min="1" step="0.01" type="range">
      </div>
      <br>

    </div>
  </div>
</div>

</body>


<script id="vertex-shader" type="x-shader/x-vertex">
  attribute vec4 vPosition;
  //attribute vec4 vColor;
  uniform vec4 vColor;

  uniform mat4  M_model_transform;
  uniform mat4  M_world_to_ndc;
  uniform mat4  M_projection;
  uniform mat4  M_camera;
  uniform mat4  M_world_rotation;

  // varying type variable to share with fragment shader, as the color
  // will be sent to the fragment shader
  varying vec4 fColor;

  void main() {
    gl_Position = M_world_to_ndc * M_projection * M_camera *
    M_world_rotation * M_model_transform * vPosition;

    fColor = vColor;
  }
</script>

<script id="fragment-shader" type="x-shader/x-fragment">

  precision mediump float;

  // vertex color coming from vertex shader
  varying vec4 fColor;

  void main() {
    gl_FragColor = fColor;
  }

</script>

<!-- WebGL utils -->
<script src="utils/webgl-utils.js" type="text/javascript"></script>
<script src="utils/initShaders.js" type="text/javascript"></script>

<!-- Linear algebra -->
<script src="utils/MV.js" type="text/javascript"></script>
<script src="matrix.js" type="text/javascript"></script>

<!-- boids things -->
<script src="boid.js" type="text/javascript"></script>
<script src="grid.js" type="text/javascript"></script>
<script src="cell.js" type="text/javascript"></script>

<!-- actual script, the "main" part -->
<script src="boids.js" type="text/javascript"></script>

<link crossorigin="anonymous"
      href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"
      integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u"
      rel="stylesheet">

</html>
