function identity() {
  return mat4(
    vec4(1., 0., 0., 0.),
    vec4(0., 1., 0., 0.),
    vec4(0., 0., 1., 0.),
    vec4(0., 0., 0., 1.)
  );
}

function translate(dx, dy, dz = 0.0) {
  return mat4(
    vec4(1., 0., 0., dx),
    vec4(0., 1., 0., dy),
    vec4(0., 0., 1., dz),
    vec4(0., 0., 0., 1.)
  );
}

function scale(sx, sy, sz = 1.0) {
  return mat4(
    vec4(sx, 0., 0., 0.),
    vec4(0., sy, 0., 0.),
    vec4(0., 0., sz, 0.),
    vec4(0., 0., 0., 1.)
  );
}

/* source: http://cg.robasworld.com/computational-geometry-3d-transformations/
 * 
 * if shearing a 2D object, only sxy and syx should be specified
 *
 * sxy shears x with respect to y (as y increases, transform on x * increases)
 */
function shear(sxy, syx, sxz = 0.0, syz = 0.0, szx = 0.0, szy = 0.0) {
  return mat4(
    vec4(1., sxy, sxz, 0.),
    vec4(syx, 1., syz, 0.),
    vec4(szx, szy, 1., 0.),
    vec4(0., 0., 0., 1.)
  );
}

// rotate around the z axis. Positive is counter-clockwise
function rotate_x(theta) {
  return mat4(
    vec4(1., 0., 0., 0.),
    vec4(0., Math.cos(theta), -Math.sin(theta), 0.),
    vec4(0., Math.sin(theta), Math.cos(theta), 0.),
    vec4(0., 0., 0., 1.),
  );
}

function rotate_y(theta) {
  return mat4(
    vec4(Math.cos(theta), 0., Math.sin(theta), 0.),
    vec4(0., 1., 0., 0.),
    vec4(-Math.sin(theta), 0., Math.cos(theta), 0.),
    vec4(0., 0., 0., 1.)
  );
}

function rotate_z(theta) {
  return mat4(
    vec4(Math.cos(theta), -Math.sin(theta), 0., 0.),
    vec4(Math.sin(theta), Math.cos(theta), 0., 0.),
    vec4(0., 0., 1., 0.),
    vec4(0., 0., 0., 1.)
  );
}

function rotate(theta, axis) {
  switch (axis) {
    case 'x':
      return rotate_x(theta);
    case 'y':
      return rotate_y(theta);
    case 'z':
      return rotate_z(theta);
    default:
      throw "rotate: bad axis specified!"
  }
}

/*
 * for the equation Q = MP, this function returns matrix M.
 *
 * This M is designed to take a P written with world coordinates and convert it
 * to Q written in NDC
 *
 * wc is the world coordinate system, which must have the following structure:
 *
 * let wc = {
 *   x_min: Number,
 *   x_max: Number,
 *   y_min: Number,
 *   y_max: Number,
 *   z_min: Number,
 *   z_max: Number,
 * }
 */
function worldToNormalized(wc) {
  /* how does this work?
   *
   * imagine a cube that is the world coordinate system. Its scale is
   * arbitrary. We want it to match up with the NDC window
   */

  /* To do this, we need to do 3 transformations:
   *  - Transform bottom left corner of world coordinate system to 0,0,0 in NDC
   *  - Scale world coordinate system to be 2x2x2 units
   *  - move corer of world coordinate system to -1, -1, -1 in NDC
   */

  /* translate the bottom left corner of the world coordinate system to 0,0 in
   * NDC
   */
  let translate_world_to_ndc_center = translate(
    -wc.x_min, -wc.y_min, -wc.z_min);

  /* scale the world coordinate system to size 2 x 2. Why this works:
   *
   *  - size of world coordinate system is (x_max - x_min, y_max - y_min)
   *  - size of NDC system is (2, 2)
   *
   *  Therefore:
   *
   *  NDC_size_x = world_size_x * NDC_size_x / world_size_x
   *  NDC_size_x = world_size_x * 2.0 / (x_max - x_min)
   *
   *  so we apply scale to world_size. Therefore we want to scale (multiply) by
   *  NDC_size_x / world_size_x, which is 2.0 / (x_max - x_min). Likewise for
   *  the y dimension
   */
  let scale_world_to_ndc_size = scale(
    2.0/(wc.x_max - wc.x_min),
    2.0/(wc.y_max - wc.y_min),
    2.0/(wc.z_max - wc.z_min));

  /* translate the bottom left corner of the world coordinate system to -1, -1
   * in NDC
   */
  let translate_world_to_ndc_corner = translate(-1.0, -1.0, -1.0);

  return mult(translate_world_to_ndc_corner,
    mult(scale_world_to_ndc_size, translate_world_to_ndc_center)
  );
}

function lookAt(eye, at, up) {
  if (eye.length != 3 || at.length != 3 || up.length != 3) {
    console.error("all three parameters of 'lookAt' must be vectors (lists) " +
      "of length 3");
    return null;
  }

  let lookAtDirection = subtract(at, eye);
  let lookAtDirectionNormalized = normalize(lookAtDirection);

  let upNormalized = normalize(up);

  // this will handle all the rotate stuff
  let u = cross(lookAtDirectionNormalized, upNormalized);
  let v = cross(u, lookAtDirectionNormalized);
  let n = negate(lookAtDirectionNormalized);

  // we also need to transform from eye location to 0, 0, 0. This is what the
  // right-most column of the matrix is for
  let transform_xu = -dot(u, eye);
  let transform_yv = -dot(v, eye);
  let transform_zn = -dot(n, eye);

  // put everything together
  let result = mat4(
    vec4(u, transform_xu),
    vec4(v, transform_yv),
    vec4(n, transform_zn),
    vec4(0, 0, 0, 1),
  )

  return result;
}

function orthographicProjection(left, right, bottom, top, near, far) {
  // even though this was in the slides, including it in our projection breaks the code for me
  // let M_norm = mat4(
  //     vec4(1, 0, 0, 0),
  //     vec4(0, 1, 0, 0),
  //     vec4(0, 0, 0, 0),
  //     vec4(0, 0, 0, 1),
  // );

  let M_projection = mat4(
    vec4(2 / (right - left), 0, 0, -(right + left) / (right - left)),
    vec4(0, 2 / (top - bottom), 0, -(top + bottom) / (top - bottom)),
    vec4(0, 0, -2 / (far - near), -(far + near) / (far - near)),
    vec4(0, 0, 0, 1),
  );

  // return mult(M_norm, M_projection);
  return M_projection;
}

function perspectiveProjection(width, height, near, far) {
  return mat4(
    near / (width / 2), 0, 0, 0,
    0, near / (height / 2), 0, 0,
    0, 0, -(far + near) / (far - near), -(2 * far * near) / (far - near),
    0, 0, -1, 0,
  );
}

function perspectiveProjectionFlat(width, height, near, far) {
  return new Float32Array([
    near / (width / 2), 0, 0, 0,
    0, near / (height / 2), 0, 0,
    0, 0, -(far + near) / (far - near), -1,
    0, 0, -(2 * far * near) / (far - near), 0,
  ])
}

// converting from FOV to width/height/near/far and vice versa is described in the openGL faq:
// https://www.opengl.org/archives/resources/faq/technical/transformations.htm
function perspectiveProjectionFov(fovX, fovY, near, far) {
  // w and h should really be a function of "near", but the example shows the projection width and height
  // as static with respect to near

  let h = 2 * Math.tan(fovY * 0.5) * near;
  let w = 2 * Math.tan(fovX * 0.5) * near;

  // let h = 2 * Math.tan(fovY*0.5);
  // let w = 2 * Math.tan(fovX*0.5);
  return perspectiveProjection(w, h, near, far);
}

function perspectiveProjectionFovAspect(fovY, aspectRatio, near, far) {
  let h = 2 * Math.tan(fovY * 0.5) * near;
  return perspectiveProjection(aspectRatio * h, h, near, far);
}
