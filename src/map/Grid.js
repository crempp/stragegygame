import { qrRange } from "../util/util";

// q = x
// r = y
const NEIGHBOR_QRS = [
  { q: 1, r: -1 }, // NE
  { q: 1, r: 0 },  // E
  { q: 0, r: 1 },  // SE
  { q: -1, r: 1 }, // SW
  { q: -1, r: 0 }, // W
  { q: 0, r: -1 }  // NW
];

/**
 * @classdesc
 * The maps hexagonal grid. The grid is represented in two coordinate systems
 * (q, r) which defines the grid layout and (i, j) which represents the data
 * location in the array of tiles.
 *
 * The grid is a simple data structure represented as an array. The elements
 * Tile objects with coordinates.
 *
 * In (q, r) coordinates a 96x96 map has the following structure
 * <pre>
 *                   [ 1,-3] --- [ 2,-3]
 *                    /   \       /   \
 *             [ 0,-2] --- [ 1,-2] --- [ 2,-2]
 *               /   \       /   \       /   \
 *       [ -1,-1] --- [ 0,-1] --- [ 1,-1] --- [ 2,-1]
 *        /   \       /   \       /   \       /   \
 * [-2, 0] --- [-1, 0] --- [ 0, 0] --- [ 1, 0] --- [ 2, 0]
 *        \   /       \   /       \   /       \   /
 *       [-2, 1] --- [-1, 1] --- [ 0, 1] --- [ 1, 1]
 *              \   /       \   /       \   /
 *             [-2, 2] --- [-1, 2] --- [ 0, 2]
 *                    \   /       \   /
 *                   [-2, 3] --- [-1, 3]
 * </pre>
 *
 * this corresponds to the following (i, j) structure
 *
 * <pre>
 *                  [-1, 3] --- [ 0,-3]
 *                   /   \       /   \
 *            [-1,-2] --- [ 0,-2] --- [ 1,-2]
 *             /   \       /   \       /   \
 *      [ -2,-1] --- [-1,-1] --- [ 0,-1] --- [ 1,-1]
 *        /   \       /   \       /   \       /   \
 * [-2, 0] --- [-1, 0] --- [ 0, 0] --- [ 1, 0] --- [ 2, 0]
 *        \   /       \   /       \   /       \   /
 *      [-2, 1] --- [-1, 1] --- [ 0, 1] --- [ 1, 1]
 *             \   /       \   /       \   /
 *            [-1, 2] --- [ 0, 2] --- [ 1, 2]
 *                   \   /       \   /
 *                  [-1, 3] --- [ 0, 3]
 * </pre>
 *
 * the (q,r) <=> (i,j) transforms are
 * <pre>
 *    q = i - j / 2 + ((-height / 2 + j) % 2) / 2
 *    r = j
 * </pre>
 * and
 * <pre>
 *    i = q + r / 2 - ((-height / 2 + r) % 2) / 2
 *    j = r
 * </pre>
 *
 * @memberOf module:map
 */
class Grid {

  /**
   * @constructor
   * @param {number} width Width of map in tiles
   * @param {number} height Height of map in tiles
   * @throws {Error} Will throw an error if the map size is not divisible by two.
   */
  constructor (width, height) {
    if (width % 2 !== 0 || height % 2 !== 0) {
      throw new Error("With and height of grid must be divisible by 2")
    }

    /** */
    this.data = [];

    /** Map width in tiles */
    this.width = width;

    /** Map height in tiles */
    this.height = height;

    /** 1/2 map width in tiles */
    this.halfWidth = this.width / 2;

    /** */
    this.halfHeight = this.height / 2;
  }

  /**
   * Intialize the grid with the given items
   *
   * @param tiles
   * @return {module:map.Grid}
   */
  init(tiles) {
    tiles.forEach( (tile) => {
      this.add(tile.q, tile.r, tile)
    });
    return this
  }


  initQR(f) {
    return this.forEachQR((q,r,item) => this.add(q, r, f(q, r, item)));
  }

  /**
   * Iterates over the grid using the indices (q, r), where q = [?..?] and
   * r = [?..?]. (0, 0) corresponds to the ?, (?, ?) to the ?.
   *
   * At each coordinate apply the function `f` passing the arguments (q, r, tile)
   *
   * @param {function} f Function to apply to each element
   * @return {module:map.Grid}
   */
  forEachQR (f) {
    for (let i = -this.halfWidth; i < this.halfWidth; i++) {
      for (let j = -this.halfHeight; j < this.halfHeight; j++) {
        const q = i - j / 2 + ((-this.height / 2 + j) % 2) / 2;
        const r = j;

        f(q, r, this.get(q, r))
      }
    }
    return this;
  }

  /**
   * Iterates over the grid using the indices (i,j), where i = [0..width-1] and
   * j = [0..height-1]. (0, 0) corresponds to the upper left corner,
   * (width-1, height-1) to the bottom right corner.
   *
   * At each coordinate apply the function `f` passing the arguments
   * (i, j, q, r, tile)
   *
   * @param {function} f Function to apply to each element
   * @return {module:map.Grid}
   */
  forEachIJ(f) {
    for (let i = -this.halfWidth; i < this.halfWidth; i++) {
      for (let j = -this.halfHeight; j < this.halfHeight; j++) {
        const q = i - j / 2 + ((-this.height / 2 + j) % 2) / 2;
        const r = j;
        f(i + this.halfWidth, j + this.halfHeight, q, r, this.get(q, r));
      }
    }
    return this;
  }

  /**
   * @deprecated
   * @param f
   * @return {module:map.Grid}
   */
  mapQR(f) {
    const mapped = new Grid(this.width, this.height);
    this.forEachQR((q,r,item) => mapped.add(q, r, f(q, r, item)));
    return mapped;
  }

  /**
   * Return the grid tiles as a linear array
   *
   * @return {Array}
   */
  toArray () {
    const arr = new Array(this.width * this.height);
    let i = 0;

    for (let q in this.data) {
      for (let r in this.data[q]) {
        arr[i++] = this.data[q][r];
      }
    }

    return arr;
  }

  /**
   * Get the tile at point (q, r)
   *
   * @param {number} q
   * @param {number} r
   * @return {Tile|undefined}
   */
  get (q, r) {
    const col = this.data[q];
    if (col) {
      return col[r]
    } else {
      return undefined
    }
  }

  /**
   * Get the tile at coordinated (q, r) if it exists otherwise create add
   * `defaultValue` to the grid at that point
   *
   * @param {number} q
   * @param {number} r
   * @param {Tile} defaultValue
   * @return {Tile}
   */
  getOrCreate(q, r, defaultValue) {
    const col = this.data[q];
    if (!col) {
      this.data[q] = [];
      this.data[q][r] = defaultValue;
      return defaultValue;
    }

    const tile = col[r];
    if (!tile) {
      this.data[q][r] = defaultValue;
      return defaultValue;
    }

    return tile;
  }

  /**
   * Add the given tile tile to point (q, r) in the grid
   *
   * @param {number} q
   * @param {number} r
   * @param {Tile} tile
   */
  add(q, r, tile) {
    if (q in this.data) {
      this.data[q][r] = tile;
    } else {
      const col = this.data[q] = [];
      col[r] = tile;
    }
  }

  neighbors(q, r, range = 1) {
    return (range === 1 ? NEIGHBOR_QRS : qrRange(range)).map(qr => {
      return this.get(q + qr.q, r + qr.r)
    }).filter(x => x !== undefined);
  }

  /**
   * Returns a list of exactly 6 items for each of the surrounding tiles at (q,r).
   * Non-existing neighbors will occur as "undefined". The list is always returned
   * in the same order of NE [0], E [1], SE [2], SW [3], W [4], NW [5].
   *
   * @param {number} q
   * @param {number} r
   * @returns {Array} list of exactly 6 tiles for each of the surrounding tiles
   */
  surrounding (q, r) {
    return NEIGHBOR_QRS.map(qr => {
      return this.get(q + qr.q, r + qr.r)
    });
  }
}

export default Grid;
