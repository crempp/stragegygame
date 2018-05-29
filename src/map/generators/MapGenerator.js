import Grid from "../Grid";
import Tile from "../Tile";
import {
  shuffle,
} from "../../util/random";
import {
  contains,
  sortByHeight,
} from "../../util/util";

/**
 * @classdesc
 * Base map generator class
 *
 * @memberOf module:map
 */
class MapGenerator {
  /**
   * @constructor
   * @param {number} mapSize Map size in tiles
   */
  constructor (mapSize) {
    /** Map size in tiles. This is used for width and height of the grid */
    this.mapSize = mapSize;

    /** The generated grid */
    this.grid = null;
  }

  generate() {
    this.generateGrid();
    this.generateRivers();
    return this.grid;
  }

  /**
   * Generate the map grid.
   *
   * @see {@link Grid}
   */
  generateGrid () {
    this.grid = new Grid(this.mapSize, this.mapSize);
    this.grid.initQR((q, r) => new Tile(q, r, this.grid));
  }

  /**
   * Generate rivers on the map
   */
  generateRivers () {
    // find a few river spawn points, preferably in mountains
    const tiles = this.grid.toArray();
    const numRivers = Math.max(1, Math.round(Math.sqrt(tiles.length) / 4));
    const spawns = shuffle(tiles.filter(t => t.isAccessibleMountain())).slice(0, numRivers);

    // grow the river towards the water by following the height gradient
    const rivers = spawns.map(this.growRiver);

    // assign sequential indices to rivers and their tiles
    rivers.forEach((river, riverIndex) => {
      river.forEach((tile, riverTileIndex) => {
        if (riverTileIndex < river.length - 1) {
          tile.rivers = [{riverIndex, riverTileIndex}]
        }
      })
    });
  }

  /**
   * For a given river spawn point grow the river towards an ocean
   *
   * @todo Parameterize max river length
   * @param {Tile} spawn
   * @return {Array} An array of Tiles on which the river was grown
   */
  growRiver (spawn) {
    const river = [spawn];
    let tile = spawn;

    while (!tile.isWater() && river.length < 20) {
      const neighbors = sortByHeight(tile.neighbors()).filter(t => !contains(t, river));
      if (neighbors.length === 0) {
        console.info("Aborted river generation", river, tile);
        return river;
      }

      const next = neighbors[Math.max(neighbors.length - 1, Math.floor(Math.random() * 1.2))];
      river.push(next);
      tile = next;
    }
    return river;
  }
}

export default MapGenerator;
