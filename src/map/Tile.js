import { Options } from "../Options";
import {
  perlin2D,
  simplex2D,
  varying,
} from "../util/random";

/**
 * @classdesc
 * Map tile class.
 *
 * Map tiles are given in q, r coordinates.
 *
 * @memberOf module:map
 */
class Tile {
  /**
   * @constructor
   * @param {number} q Grid tile x coordinate
   * @param {number} r Grid tile y coordinate
   * @param {Grid} Grid parent reference
   */
  constructor (q, r, grid) {
    /** Access to parent Grid */
    this.grid = grid;

    /** q tile coordinate */
    this.q = q;

    /** r tile coordinate */
    this.r = r;

    /** Tile height coordinate */
    this.height = this.randomHeight(q, r);

    /** Tile terrain type */
    this.terrain = this.terrainAt(q, r, this.height);

    /** */
    this.rivers = null;

    /** Does the tile have fog? */
    this.fog = false;

    /** Does the tile have clouds? */
    this.clouds = false;

    /** */
    this.bufferIndex = -1;

    /** */
    this.treeIndex = undefined;

    if ( !this.isMountain() &&
         !this.isWater() &&
         this.terrain !== "desert" &&
         varying([true, false, false])
    ) {
      this.treeIndex = this.treeAt();
    }
  }

  /**
   * Is the tile a land tile?
   *
   * @return {boolean}
   */
  isLand() {
    let a = Options.map.tileOptions.landRange[0];
    let b = Options.map.tileOptions.landRange[1];
    return this.height >= a && this.height < b;
  }

  /**
   * Is the tile a water tile?
   *
   * @return {boolean}
   */
  isWater() {
    let a = Options.map.tileOptions.waterRange[0];
    let b = Options.map.tileOptions.waterRange[1];
    return this.height >= a && this.height < b;
  }

  /**
   * Is the tile a hill tile?
   *
   * @return {boolean}
   */
  isHill() {
    let a = Options.map.tileOptions.hillRange[0];
    let b = Options.map.tileOptions.hillRange[1];
    return this.height >= a && this.height < b;
  }

  /**
   * Is the tile a mountain tile?
   *
   * @return {boolean}
   */
  isMountain() {
    let a = Options.map.tileOptions.mountainRange[0];
    let b = Options.map.tileOptions.mountainRange[1];
    return this.height >= a && this.height < b;
  }

  /**
   * Randomly determine a warm zone terrain type
   *
   * @return {String} Terrain type
   */
  warmZone() {
    return varying([
      "grass",
      "grass",
      "grass",
      "plains",
      "plains",
      "desert"
    ]);
  }

  /**
   * Randomly determine a cold zone terrain type
   *
   * @param {number} q Grid tile x coordinate
   * @param {number} r Grid tile y coordinate
   * @param {number} height Grid tile height
   * @return {*}
   */
  coldZone(q, r, height) {
    if (Math.abs(r) > this.grid.height * (0.44 + Math.random() * 0.03)) return "snow";
    else return "tundra";
  }

  /**
   * Determine the terrain at the given coordinates (q,r)
   *
   * @param {number} q Grid tile x coordinate
   * @param {number} r Grid tile y coordinate
   * @param {number} height Grid tile height
   * @return {string} Terrain type
   */
  terrainAt (q, r, height) {
    if (this.isWater()) return "ocean";
    else if (this.isMountain()) return "mountain";
    else if (Math.abs(r) > this.grid.height * 0.4) return this.coldZone(q, r, height);
    else return this.warmZone(q, r, height);
  }

  /**
   * Determine the tile tree index
   *
   * @return {number}
   */
  treeAt() {
    if (this.terrain === "snow") return 2;
    else if (this.terrain === "tundra") return 1;
    else return 0;
  }

  /**
   * Is the tile a mountain tile that is accessible by a land tile?
   *
   * Accessibility means that the mountain tile contains 4 or more land terrain
   * neighbors
   *
   * @return {boolean}
   */
  isAccessibleMountain() {
    let ns = this.neighbors();
    let spring = this.isMountain();
    return spring && ns.filter(t => t.isLand()).length > 3;
  }

  /**
   * Generate a random height for a grid coordinate.
   *
   * @param {number} q Grid tile x coordinate
   * @param {number} r Grid tile y coordinate
   * @return {number}
   */
  randomHeight (q, r) {
    let noise1 = simplex2D(q / 10, r / 10);
    let noise2 = perlin2D(q / 5, r / 5);
    let noise3 = perlin2D(q / 30, r / 30);
    let noise = noise1 + noise2 + noise3;

    return noise / 3.0 * 2.0;
  }

  /**
   * Return a list of this tiles neighbors
   *
   * @return {Array} Array of tile neighbors
   */
  neighbors () {
    return this.grid.neighbors(this.q, this.r);
  }
}

export default Tile;
