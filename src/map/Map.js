/**
 * @description
 * The Map module contains all the classes used to generate a hex map for the
 * game
 *
 * @module map
 */

import {
  MeshBasicMaterial,
  Mesh,
  RingGeometry,
} from "three";
import Grid from "./Grid";
import { Options } from "../Options";
import Controller from "./Controller";
import ChunkedLazyMapMesh from "./geometry/ChunkedLazyMapMesh";
import MapMesh from "./geometry/MapMesh";
import Hexagon from "./geometry/Hexagon";
import {
  loadTexture,
  loadTextureAtlas,
  varying,
  shuffle,
  sortByHeight,
  contains,
} from "../util/util";
import {
  axialToCube,
  cubeToAxial,
  mouseToWorld,
  roundToHex,
  qrToWorld,
} from "../util/coords"
import {
  seed,
  simplex2,
  perlin2,
} from "../util/perlin";

/**
 * @classdesc
 * Map does a foo bar asdfasd asdf asdf asdfaf dsasdf
 *
 * @memberOf module:map
 */
class Map {
  /**
   * @constructor
   * @param three
   */
  constructor (three) {
    this.three = three;

    this.mapSize = Options.map.mapSize;

    // VIEW
    this.terrainAtlas = null;
    this.terrainAtlasTexture = loadTexture("terrain.png");
    this.hillsNormalTexture = loadTexture("hills-normal.png");
    this.coastAtlasTexture = loadTexture("coast-diffuse.png");
    this.riverAtlasTexture = loadTexture("river-diffuse.png");
    this.undiscoveredTexture = loadTexture("paper.jpg");
    this.treeSpritesheet = loadTexture("trees.png");
    this.transitionTexture = loadTexture("transitions.png");

    // MAPVIEW
    this.lastTimestamp = Date.now();
    this.zoom = 25;
    this.mapMesh = null;
    this.chunkedMesh = null;
    this.tileGrid = new Grid(0, 0);
    this.tileSelector = this.createTileSelector();
    this.controller = new Controller(this, this.three);
    this.selectedTile = null;
    this.onTileSelected = (tile) => {};
    this.onLoaded = () => {};
    // this.onAnimate = this.controller.onAnimate;
    this.scrollSpeed = 10;

    // tile selector
    this.tileSelector.position.setZ(0.1);
    this.three.scene.add(this.tileSelector);
    this.tileSelector.visible = true;

    // load then start rendering loop
    this.load().then(() => {
      this.animate();
    });
  }

  load () {
    return Promise.all([
      this.generateMap(this.mapSize),
      loadTextureAtlas()
    ])
      .then((results) => {
        const [tiles, atlas] = results;
        this.terrainAtlas = atlas;

        // this.mapView.load(map, this.options);
        // load(tiles: Grid<TileData>, options: MapMeshOptions) {

        this.tileGrid = tiles;
        this.selectedTile = this.tileGrid.get(0, 0);

        if ((tiles.width * tiles.height) < Math.pow(512, 2)) {
          const mesh = this.mapMesh = new MapMesh(tiles.toArray(), null, this.terrainAtlas);
          this.three.scene.add(this.mapMesh);
          mesh.loaded.then(() => {
            if (this.onMeshLoaded) this.onMeshLoaded();
          });
          console.info("using single MapMesh for " + (tiles.width * tiles.height) + " tiles")
        } else {
          const mesh = this._mapMesh = this.chunkedMesh = new ChunkedLazyMapMesh(tiles, options)
          this.three.scene.add(this.mapMesh);
          mesh.loaded.then(() => {
            if (this.onMeshLoaded) this.onMeshLoaded()
          });
          console.info("using ChunkedLazyMapMesh with " + mesh.numChunks + " chunks for " + (tiles.width * tiles.height) + " tiles")
        }

        // this.onAnimate = this.controller.onAnimate;

        this.onLoaded = () => {
          // uncover tiles around initial selection
          this.setFogAround(this.selectedTile, 10, true, false);
          this.setFogAround(this.selectedTile, 5, false, false);
        };

        this.onTileSelected = (tile) => {
          // uncover tiles around selection
          this.setFogAround(tile, 2, false, false);
        };
      });
  }

  animate () {
    const timestamp = Date.now();
    const dtS = (timestamp - this.lastTimestamp) / 1000.0;

    const zoomRelative = this.three.camera.position.z / Options.camera.zoom;
    const scroll = this.controller.scrollDir.clone().normalize().multiplyScalar(this.scrollSpeed * zoomRelative * dtS);
    this.three.camera.position.add(scroll);

    if (this.chunkedMesh) {
      this.chunkedMesh.updateVisibility(camera);
    }

    // this.onAnimate(dtS);
    this.controller.onAnimate(dtS);

    this.three.renderer.render(this.three.scene, this.three.camera);
    requestAnimationFrame(this.animate.bind(this));
    this.lastTimestamp = timestamp;
  }
  // animate () {
  //   requestAnimationFrame( this.animate.bind(this) );
  //   // this.mapMesh.rotation.x += 0.005;
  //   // this.mapMesh.rotation.y += 0.01;
  //   this.three.renderer.render( this.three.scene, this.three.camera );
  // }

  /**
   * @param fog whether there should be fog on this tile making it appear darker
   * @param clouds whether there should be "clouds", i.e. an opaque texture, hiding the tile
   * @param range number of tiles around the given tile that should be updated
   * @param tile tile around which fog should be updated
   */
  setFogAround (tile, range, fog, clouds) {
    const tiles = this.tileGrid.neighbors(tile.q, tile.r, range);

    const updated = tiles.map(t => {
      t.fog = fog;
      t.clouds = clouds;
      return t;
    });

    this.updateTiles(updated)
  }

  createTileSelector () {
    const geometry = new RingGeometry(0.85, 1, 6, 2);
    const material = new MeshBasicMaterial({
      color: 0xffff00
    });
    const selector = new Mesh(geometry, material);
    selector.rotateZ(Math.PI/2);

    return selector;
  }

  //--------------------------------------------------------------------------------
  // MAP VIEW
  //--------------------------------------------------------------------------------
  updateTiles (tiles) {
    this.mapMesh.updateTiles(tiles);
  }

  getTile (q, r) {
    return this.mapMesh.getTile(q, r);
  }

  //--------------------------------------------------------------------------------
  // MAP VIEW
  //--------------------------------------------------------------------------------

  /**
   * Returns the world space position on the Z plane (the plane with the tiles) at the center of the view.
   */
  getViewCenter () {
    return mouseToWorld({
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2
    }, this.three.camera);
  }

  getCameraFocusPosition (pos) {
    return this.getCameraFocusPositionWorld(qrToWorld(pos.q, pos.r));
  }

  getCameraFocusPositionWorld (pos) {
    const currentPos = this.three.camera.position.clone();
    const viewCenter = this.getViewCenter();
    const viewOffset = currentPos.sub(viewCenter);

    return pos.add(viewOffset);
  }

  focus (q, r) {
    this.three.camera.position.copy(this.getCameraFocusPosition({q, r}));
  }

  focusWorldPos (v) {
    this.three.camera.position.copy(this.getCameraFocusPositionWorld(v));
  }

  selectTile (tile) {
    const worldPos = qrToWorld(tile.q, tile.r);
    this.tileSelector.position.set(worldPos.x, worldPos.y, 0.1);
    if (this.onTileSelected) {
      this.onTileSelected(tile)
    }
  }

  pickTile (worldPos) {
    let x = worldPos.x;
    let y = worldPos.y;

    // convert from world coordinates into fractal axial coordinates
    let q = (1.0 / 3 * Math.sqrt(3) * x - 1.0 / 3 * y);
    let r = 2.0 / 3 * y;

    // now need to round the fractal axial coords into integer axial coords for the grid lookup
    let cubePos = axialToCube(q, r);
    let roundedCubePos = roundToHex(cubePos);
    let roundedAxialPos = cubeToAxial(roundedCubePos.x, roundedCubePos.y, roundedCubePos.z);

    // just look up the coords in our grid
    return this.tileGrid.get(roundedAxialPos.q, roundedAxialPos.r);
  }

  //--------------------------------------------------------------------------------
  // MAP GENERATION
  //--------------------------------------------------------------------------------
  //
  // generateMap () {
  //   seed(Date.now() + Math.random());
  //   let a = new Grid(this.mapSize, this.mapSize);
  //   let b = a.mapQR((q, r) => this.tile(q, r, this.randomHeight(q, r)));
  //   const grid = b;
  //   //const grid = new Grid(this.mapSize, this.mapSize).mapQR((q, r) => this.tile(q, r, this.randomHeight(q, r)));
  //   return this.generateRivers(grid);
  // }
  //
  // randomHeight(q, r) {
  //   let noise1 = simplex2(q / 10, r / 10);
  //   let noise2 = perlin2(q / 5, r / 5);
  //   let noise3 = perlin2(q / 30, r / 30);
  //   let noise = noise1 + noise2 + noise3;
  //
  //   return noise / 3.0 * 2.0
  // }
  //
  // isLand(height) {
  //   return height >= 0.0 && height < 0.75
  // }
  //
  // isWater(height) {
  //   return height < 0.0
  // }
  //
  // isHill(height) {
  //   return height >= 0.375 && height < 0.75
  // }
  //
  // isMountain(height) {
  //   return height >= 0.75
  // }
  //
  // coldZone(q, r, height) {
  //   if (Math.abs(r) > this.mapSize * (0.44 + Math.random() * 0.03)) return "snow";
  //   else return "tundra";
  // }
  //
  // warmZone(q, r, height) {
  //   return varying(["grass", "grass", "grass", "plains", "plains", "desert"]);
  // }
  //
  // terrainAt(q, r, height) {
  //   if (height < 0.0) return "ocean";
  //   else if (height > 0.75) return "mountain";
  //   else if (Math.abs(r) > this.mapSize * 0.4) return this.coldZone(q, r, height);
  //   else return this.warmZone(q, r, height);
  // }
  //
  // treeAt(q, r, terrain) {
  //   if (terrain === "snow") return 2;
  //   else if (terrain === "tundra") return 1;
  //   else return 0;
  // }
  //
  // /**
  //  * Is the tile a mountain tile that is accessible by a land tile?
  //  *
  //  * Accessiblily means that the mountain tile contains 4 or more land terrain
  //  * neighbors
  //  *
  //  * @param tile
  //  * @param grid
  //  * @return {*|boolean}
  //  */
  // isAccessibleMountain(tile, grid) {
  //   let ns = grid.neighbors(tile.q, tile.r);
  //   let spring = this.isMountain(tile.height);
  //   return spring && ns.filter(t => this.isLand(t.height)).length > 3;
  // }
  //
  // growRiver (spawn) {
  //   const river = [spawn];
  //   let tile = spawn;
  //
  //   while (!this.isWater(tile.height) && river.length < 20) {
  //     const neighbors = sortByHeight(grid.neighbors(tile.q, tile.r)).filter(t => !contains(t, river))
  //     if (neighbors.length === 0) {
  //       console.info("Aborted river generation", river, tile);
  //       return river;
  //     }
  //
  //     const next = neighbors[Math.max(neighbors.length - 1, Math.floor(Math.random() * 1.2))];
  //     river.push(next);
  //     tile = next;
  //   }
  //   return river;
  // }
  //
  // tile (q, r, height) {
  //   const terrain = this.terrainAt(q, r, height);
  //   const trees = this.isMountain(height) || this.isWater(height) || terrain === "desert" ? undefined :
  //     (varying([true, false, false]) ? this.treeAt(q, r, terrain) : undefined);
  //   return {
  //     q,
  //     r,
  //     height,
  //     terrain,
  //     treeIndex: trees,
  //     rivers: null,
  //     fog: false,
  //     clouds: false,
  //     isMountain: this.isMountain(height),
  //     isHill: this.isHill(height),
  //     isWater: this.isWater(height),
  //     bufferIndex: -1,
  //   }
  // }
  //
  // generateRivers (grid){
  //   // find a few river spawn points, preferably in mountains
  //   const tiles = grid.toArray();
  //   const numRivers = Math.max(1, Math.round(Math.sqrt(grid.length) / 4));
  //   const spawns = shuffle(tiles.filter(t => this.isAccessibleMountain(t, grid))).slice(0, numRivers);
  //
  //   // grow the river towards the water by following the height gradient
  //   const rivers = spawns.map(this.growRiver);
  //
  //   // assign sequential indices to rivers and their tiles
  //   rivers.forEach((river, riverIndex) => {
  //     river.forEach((tile, riverTileIndex) => {
  //       if (riverTileIndex < river.length - 1) {
  //         tile.rivers = [{riverIndex, riverTileIndex}]
  //       }
  //     })
  //   });
  //
  //   return grid;
  // }

  /**
   * Computes the water adjecency for the given tile.
   * @param grid grid with all tiles to be searched
   * @param tile tile to look at
   */
  static waterAdjacency(grid, tile) {
    function isWaterTile (q, r) {
      const t = grid.get(q, r);
      if (!t) return false;
      return t.isWater;
    }

    return {
      NE: isWaterTile(tile.q + 1, tile.r - 1),
      E: isWaterTile(tile.q + 1, tile.r),
      SE: isWaterTile(tile.q, tile.r + 1),
      SW: isWaterTile(tile.q - 1, tile.r + 1),
      W: isWaterTile(tile.q - 1, tile.r),
      NW: isWaterTile(tile.q, tile.r - 1)
    };
  }

  /**
   * Returns a random point on a hex tile considering adjacent water, i.e. avoiding points on the beach.
   * @param water water adjacency of the tile
   * @param scale coordinate scale
   * @returns {THREE.Vector3} local position
   */
  static randomPointOnCoastTile(water, scale = 1.0) {
    return Hexagon.randomPointInHexagon(scale, corner => {
      corner = (2 + (6 - corner)) % 6;
      if (corner === 0 && water.NE) return 0.5;
      if (corner === 1 && water.E) return 0.5;
      if (corner === 2 && water.SE) return 0.5;
      if (corner === 3 && water.SW) return 0.5;
      if (corner === 4 && water.W) return 0.5;
      if (corner === 5 && water.NW) return 0.5;
      return 1
    })
  }
}

export default Map;
