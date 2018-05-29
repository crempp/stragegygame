/** @module util/coords */

import {
  Vector3,
  Plane,
  Raycaster
} from "three"

const Z_PLANE = new Plane(new Vector3(0, 0, 1), 0);

/**
 * Convert grid q, r coordinates to world coordinates
 *
 * @function
 * @param {number} q
 * @param {number} r
 * @param {float} scale
 * @returns {Vector3}
 */
export function qrToWorld(q, r, scale = 1.0) {
  return new Vector3(Math.sqrt(3) * (q + r / 2) * scale, (3 / 2) * r * scale, 0);
}

/**
 * Convert grid q, r coordinates to world coordinates and return the `x` value
 *
 * @function
 * @param {number} q
 * @param {number} r
 * @param {float} scale
 * @returns {number}
 */
export function qrToWorldX(q, r, scale = 1.0) {
  return Math.sqrt(3) * (q + r / 2) * scale;
}

/**
 * Convert grid q, r coordinates to world coordinates and return the `y` value
 *
 * @function
 * @param {number} q
 * @param {number} r
 * @param {float} scale
 * @returns {number}
 */
export function qrToWorldY(q, r, scale = 1.0) {
  return (3 / 2) * r * scale;
}

/**
 * Calculate the distance between two grid coordinates `a` and `b`
 *
 * @function
 * @param {Tile} a
 * @param {Tile} b
 * @returns {number}
 */
export function qrDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/**
 * Create a Raycaster for
 *
 * @function
 * @param {Vector3} vector
 * @param {Camera} camera
 * @returns {Raycaster}
 */
export function pickingRay(vector, camera) {
  // set two vectors with opposing z values
  vector.z = -1.0;
  let end = new Vector3(vector.x, vector.y, 1.0);

  vector.unproject(camera);
  end.unproject(camera);

  // find direction from vector to end
  end.sub(vector).normalize();
  return new Raycaster(vector, end);
}

/**
 * Transforms mouse coordinates into world space, assuming that the game view
 * spans the entire window.
 *
 * @function
 * @param {MouseEvent} e Mouse event
 * @param {Camera} camera Three.js camera instance
 * @returns {*} blurp
 */
export function mouseToWorld(e, camera) {
  const mv = new Vector3((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, 0.5 );
  const raycaster = pickingRay(mv, camera);
  let r = raycaster.ray.intersectPlane(Z_PLANE);
  return r;
}

/**
 * Transforms screen coordinates into world space, assuming that the game view
 * spans the entire window.
 *
 * @function
 * @param {number} x
 * @param {number} y
 * @param {Camera} camera
 * @returns {Vector3}
 */
export function screenToWorld(x, y, camera) {
  const mv = new Vector3((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, 0.5 );
  const raycaster = pickingRay(mv, camera);
  return raycaster.ray.intersectPlane(Z_PLANE);
}

/**
 * Transforms world coordinates into screen space.
 *
 * @function
 * @param {Vector3} pos
 * @param {Camera} camera
 * @return {Vector3}
 */
export function worldToScreen(pos, camera) {
  let v = pos.clone();
  v.project(camera);
  v.x = window.innerWidth/2 + v.x * (window.innerWidth/2);
  v.y = window.innerHeight/2 - v.y * (window.innerHeight/2);

  return v;
}

/**
 *
 * @function
 * @param {number} q
 * @param {number} r
 * @return {{x: number, y: number, z: number}}
 */
export function axialToCube(q, r) {
  return { x: q, y: -q-r, z: r};
}

/**
 *
 * @function
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @return {{q: number, r: number}}
 */
export function cubeToAxial(x, y, z) {
  return { q: x, r: z };
}

/**
 * Rounds fractal cube coordinates to the nearest full cube coordinates.
 *
 * @function
 * @param {Vector3} cubeCoord
 * @returns {{x: number, y: number, z: number}}
 */
export function roundToHex(cubeCoord) {
  let x = cubeCoord.x, y = cubeCoord.y, z = cubeCoord.z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  let x_diff = Math.abs(rx - x);
  let y_diff = Math.abs(ry - y);
  let z_diff = Math.abs(rz - z);

  if (x_diff > y_diff && x_diff > z_diff) rx = -ry-rz;
  else if (y_diff > z_diff) ry = -rx-rz;
  else rz = -rx-ry;

  return {x: rx, y: ry, z: rz};
}
