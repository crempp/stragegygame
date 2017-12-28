import Hexagon from "./Hexagon"
import {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  RawShaderMaterial,
  // BufferGeometry,
  // Vector2,
  Vector3,
  Vector4,
  // Texture,
  Mesh,
  Group,
  // TextureLoader,
  // XHRLoader,
  // BufferAttribute,
  // Sphere,
  Color,
  FrontSide,
  RepeatWrapping
} from "three"
import {qrToWorld} from '../util/coords';
import Grid from "./Grid";
import {LAND_FRAGMENT_SHADER} from '../shaders/land.fragment';
import {LAND_VERTEX_SHADER} from '../shaders/land.vertex';
import {MOUNTAINS_FRAGMENT_SHADER} from '../shaders/mountains.fragment';
import {MOUNTAINS_VERTEX_SHADER} from "../shaders/mountains.vertex";
import Forests from "./Forests";
import { loadTexture } from "../util/util";
import { Options } from "../Options";

// export interface MapMeshOptions {
//   treeSpritesheetSubdivisions: number;
//
//   /**
//    * Default 1.0
//    */
//   treeSize?: number;
//
//   treeAlphaTest?: number;
//
//   /**
//    * Default 50
//    */
//   treesPerForest?: number;
//
//   /**
//    * Options per tree index to vary individual tree types.
//    */
//   treeOptions?: {
//     scale?: number;
//
//   /*
//    * Number of trees per forest
//    */
//   treesPerForest: number;
// }[];
//
//   /**
//    * Overall scale of the geometry. Default 1.0
//    */
//   scale?: number;
//
// }
//
// export interface MapMeshTile extends TileData {
//   /**
//    * Index of this tile in its vertex buffer
//    */
//   bufferIndex: number;
//
//   isMountain: boolean;
// }
//
// export interface TextureReplacements {
//   terrainAtlasTexture?: Texture;
//   riverAtlasTexture?: Texture;
//   coastAtlasTexture?: Texture;
//   undiscoveredTexture?: Texture;
//   treeTexture?: Texture;
// }

export default class MapMesh extends Group {

  /**
   * @param tiles the tiles to actually render in this mesh
   * @param globalGrid the grid with all tiles, including the ones that are not rendered in this mesh
   */
  constructor(tiles, globalGrid, terrainAtlas) {
    super();

    this.land = null;
    this.mountains = null;
    this.trees = null;
    this.boundingSphere = null;
    this._showGrid = true;
    this.terrainAtlas = terrainAtlas;

    this.terrainAtlasTexture = loadTexture("terrain.png");
    this.hillsNormalTexture = loadTexture("hills-normal.png");
    this.coastAtlasTexture = loadTexture("coast-diffuse.png");
    this.riverAtlasTexture = loadTexture("river-diffuse.png");
    this.undiscoveredTexture = loadTexture("paper.jpg");
    this.treeSpritesheet = loadTexture("trees.png");
    this.transitionTexture = loadTexture("transitions.png");

    /**
     * List of tiles displayed in this mesh
     */
    // this.tiles = tiles.map(t => ({
    //   bufferIndex: -1,
    //   isMountain: isMountain(t.height),
    //   ...t
    // }));
    this.tiles = tiles;

    /**
     * Grid of the tiles displayed in this mesh containing the same elements as this.tiles
     */
    this.localGrid = new Grid(0, 0).init(this.tiles);

    /**
     * Global grid of all tiles, even the ones not displayed in this mesh
     */
    this.globalGrid = globalGrid || this.localGrid;

    this.hillsNormalTexture.wrapS = this.hillsNormalTexture.wrapT = RepeatWrapping;
    this.terrainAtlasTexture.wrapS = this.terrainAtlasTexture.wrapT = RepeatWrapping;
    this.undiscoveredTexture.wrapS = this.undiscoveredTexture.wrapT = RepeatWrapping;
    //this.transitionTexture.flipY = true

    let blurp = this.tiles.filter(t => !t.isMountain);

    this.loaded = Promise.all([
      this.createLandMesh(blurp),
      this.createMountainMesh(this.tiles.filter(t => t.isMountain)),
      this.createTrees()
    ])
    //   .catch((err) => {
    //   console.error("Could not create MapMesh", err)
    // });
  }

  get showGrid() {
    return this._showGrid
  }

  set showGrid(value) {
    this._showGrid = value;

    const landMaterial = this.land.material;
    landMaterial.uniforms.showGrid.value = value ? 1.0 : 0.0;

    const mountainMaterial = this.mountains.material;
    mountainMaterial.uniforms.showGrid.value = value ? 1.0 : 0.0;
  }


  /**
   * "Hot-swaps" the given textures.
   * @param textures
   */
  replaceTextures(textures) {
    for (let name in textures) {
      const replacement = textures[name];
      if (replacement) {
        const old = this[name];
        const {wrapT, wrapS} = old;

        old.copy(replacement);
        old.wrapT = wrapT;
        old.wrapS = wrapS;
        old.needsUpdate = true;
      }
    }
  }

  updateTiles(tiles) {
    this.updateFogAndClouds(tiles);
    this.trees.updateTiles(tiles);
  }

  getTile(q, r) {
    return this.localGrid.get(q, r);
  }

  /**
   * Updates only fog and clouds visualization of existing tiles.
   * @param tiles changed tiles
   */
  updateFogAndClouds(tiles) {
    const landGeometry = this.land.geometry;
    const landStyleAttr = landGeometry.getAttribute("style");
    const mountainsGeometry = this.mountains.geometry;
    const mountainsStyleAttr = mountainsGeometry.getAttribute("style");

    tiles.forEach(updated => {
      const old = this.localGrid.get(updated.q, updated.r);
      if (!old) return;

      if (updated.fog !== old.fog || updated.clouds !== old.clouds) {
        old.fog = updated.fog;
        old.clouds = updated.clouds;
        const attribute = old.isMountain ? mountainsStyleAttr : landStyleAttr;
        MapMesh.updateFogStyle(attribute, old.bufferIndex, updated.fog, updated.clouds);
      }
    });

    landStyleAttr.needsUpdate = true;
    mountainsStyleAttr.needsUpdate = true;
  }

  static updateFogStyle (attr, index, fog, clouds) {
    const style = attr.getY(index);
    const fogMask = 0b1;
    const newStyle = fog ? (style | fogMask) : (style & ~fogMask);
    const withClouds = !clouds ? newStyle % 100 : 100 + newStyle;

    attr.setY(index, withClouds);
  }

  async createTrees() {
    const trees = this.trees = new Forests(this.tiles, this.globalGrid, {
      treeSize: Options.treeSize || 1.44,
      spritesheet: this.treeSpritesheet,
      spritesheetSubdivisions: Options.treeSpritesheetSubdivisions,
      treesPerForest: Options.treesPerForest || 50,
      mapScale: Options.scale || 1.0,
      alphaTest: Options.treeAlphaTest || 0.2,
      treeOptions: Options.treeOptions
    });
    this.add(trees);
  }

  async createLandMesh(tiles) {
    const atlas = this.terrainAtlas;
    const geometry = this.createHexagonTilesGeometry(tiles, this.globalGrid, 0);
    const material = new RawShaderMaterial({
      uniforms: {
        sineTime: {value: 0.0},
        showGrid: {value: this._showGrid ? 1.0 : 0.0},
        camera: {type: "v3", value: new Vector3(0, 0, 0)},
        texture: {type: "t", value: this.terrainAtlasTexture},
        textureAtlasMeta: {
          type: "4f",
          value: new Vector4(atlas.width, atlas.height, atlas.cellSize, atlas.cellSpacing)
        },
        hillsNormal: {
          type: "t",
          value: this.hillsNormalTexture
        },
        coastAtlas: {
          type: "t",
          value: this.coastAtlasTexture
        },
        riverAtlas: {
          type: "t",
          value: this.riverAtlasTexture
        },
        mapTexture: {
          type: "t",
          value: this.undiscoveredTexture
        },
        transitionTexture: {
          type: "t",
          value: this.transitionTexture
        },
        lightDir: {
          type: "v3",
          value: new Vector3(0.5, 0.6, -0.5).normalize()
        },
        gridColor: {
          type: "c",
          value: typeof Options.gridColor !== "undefined" ? Options.gridColor : new Color(0xffffff)
        },
        gridWidth: {
          type: "f",
          value: typeof Options.gridWidth !== "undefined" ? Options.gridWidth : 0.02
        },
        gridOpacity: {
          type: "f",
          value: typeof Options.gridOpacity !== "undefined" ? Options.gridOpacity : 0.33
        }
      },
      vertexShader: LAND_VERTEX_SHADER,
      fragmentShader: LAND_FRAGMENT_SHADER,
      side: FrontSide,
      wireframe: false,
      transparent: false
    });

    this.land = new Mesh(geometry, material);
    this.land.frustumCulled = false;

    this.add(this.land);
  }

  async createMountainMesh(tiles) {
    const atlas = this.terrainAtlas;
    const geometry = this.createHexagonTilesGeometry(tiles, this.globalGrid, 1);
    const material = new RawShaderMaterial({
      uniforms: {
        sineTime: {value: 0.0},
        showGrid: {value: this._showGrid ? 1.0 : 0.0},
        camera: {type: "v3", value: new Vector3(0, 0, 0)},
        texture: {type: "t", value: this.terrainAtlasTexture},
        textureAtlasMeta: {
          type: "4f",
          value: new Vector4(atlas.width, atlas.height, atlas.cellSize, atlas.cellSpacing)
        },
        hillsNormal: {
          type: "t",
          value: this.hillsNormalTexture
        },
        mapTexture: {
          type: "t",
          value: this.undiscoveredTexture
        },
        lightDir: {
          type: "v3",
          value: new Vector3(0.5, 0.6, -0.5).normalize()
        },
        gridColor: {
          type: "c",
          value: typeof Options.gridColor !== "undefined" ? Options.gridColor : new Color(0xffffff)
        },
        gridWidth: {
          type: "f",
          value: typeof Options.gridWidth !== "undefined" ? Options.gridWidth : 0.02
        },
        gridOpacity: {
          type: "f",
          value: typeof Options.gridOpacity !== "undefined" ? Options.gridOpacity : 0.33
        }
      },
      vertexShader: MOUNTAINS_VERTEX_SHADER,
      fragmentShader: MOUNTAINS_FRAGMENT_SHADER,
      side: FrontSide,
      wireframe: false,
      transparent: false
    });

    this.mountains = new Mesh(geometry, material);
    this.mountains.frustumCulled = false;

    this.add(this.mountains);
  }

  createHexagonTilesGeometry (tiles, grid, numSubdivisions) {
    const scale = Options.scale || 1.0;
    const hexagon = new Hexagon(scale, numSubdivisions);
    const geometry = new InstancedBufferGeometry();
    const textureAtlas = this.terrainAtlas;

    geometry.maxInstancedCount = tiles.length;
    geometry.addAttribute("position", hexagon.geometry.attributes.position);
    geometry.addAttribute("uv", hexagon.geometry.attributes.uv);
    geometry.addAttribute("border", hexagon.geometry.attributes.border);

    // positions for each hexagon tile
    const tilePositions = tiles.map((tile) => qrToWorld(tile.q, tile.r, scale));
    const posAttr = new InstancedBufferAttribute(new Float32Array(tilePositions.length * 2), 2, 1);
    posAttr.copyVector2sArray(tilePositions);
    geometry.addAttribute("offset", posAttr);

    //----------------
    const cellSize = textureAtlas.cellSize;
    const cellSpacing = textureAtlas.cellSpacing;
    const numColumns = textureAtlas.width / cellSize;

    function terrainCellIndex(terrain) {
      const cell = textureAtlas.textures[terrain];
      return cell.cellY * numColumns + cell.cellX;
    }

    const styles = tiles.map((tile, index) => {
      const cell = textureAtlas.textures[tile.terrain];
      if (!cell) {
        throw new Error(`Terrain '${tile.terrain}' not in texture atlas\r\n` + JSON.stringify(textureAtlas));
      }

      const cellIndex = terrainCellIndex(tile.terrain);
      const shadow = tile.fog ? 1 : 0;
      const clouds = tile.clouds ? 1 : 0;
      const hills = tile.isHill ? 1 : 0;
      const style = shadow * 1 + hills * 10 + clouds * 100;

      // Coast and River texture index
      const coastIdx = this.computeCoastTextureIndex(grid, tile);
      const riverIdx = this.computeRiverTextureIndex(grid, tile);

      tile.bufferIndex = index;

      return new Vector4(cellIndex, style, coastIdx, riverIdx);
    });

    const styleAttr = new InstancedBufferAttribute(new Float32Array(tilePositions.length * 4), 4, 1);
    styleAttr.copyVector4sArray(styles);
    geometry.addAttribute("style", styleAttr);

    // surrounding tile terrain represented as two consecutive Vector3s
    // 1. [tileIndex + 0] = NE, [tileIndex + 1] = E, [tileIndex + 2] = SE
    // 2. [tileIndex + 0] = SW, [tileIndex + 1] = W, [tileIndex + 2] = NW
    const neighborsEast = new InstancedBufferAttribute(new Float32Array(tiles.length * 3), 3, 1);
    const neighborsWest = new InstancedBufferAttribute(new Float32Array(tiles.length * 3), 3, 1);

    for (let i = 0; i < tiles.length; i++) {
      const neighbors = grid.surrounding(tiles[i].q, tiles[i].r);

      for (let j = 0; j < neighbors.length; j++) {
        const neighbor = neighbors[j];
        const attr = j > 2 ? neighborsWest : neighborsEast;
        const array = attr.array;

        // terrain cell index indicates the type of terrain for lookup in the shader
        array[3 * i + j % 3] = neighbor ? terrainCellIndex(neighbor.terrain) : -1;
      }
    }

    geometry.addAttribute("neighborsEast", neighborsEast);
    geometry.addAttribute("neighborsWest", neighborsWest);

    return geometry
  }

  computeCoastTextureIndex (grid, tile) {
    function isWaterTile(q, r) {
      const t = grid.get(q, r);
      if (!t) return false;
      return t.isWater;
    }

    function bit(x) {
      return x ? "1" : "0";
    }

    if (isWaterTile(tile.q, tile.r)) {
      // only land tiles have a coast
      return 0;
    }

    const NE = bit(isWaterTile(tile.q + 1, tile.r - 1));
    const E = bit(isWaterTile(tile.q + 1, tile.r));
    const SE = bit(isWaterTile(tile.q, tile.r + 1));
    const SW = bit(isWaterTile(tile.q - 1, tile.r + 1));
    const W = bit(isWaterTile(tile.q - 1, tile.r));
    const NW = bit(isWaterTile(tile.q, tile.r - 1));

    return parseInt(NE + E + SE + SW + W + NW, 2);
  }

  isNextOrPrevRiverTile (grid, tile, q, r, coastCount) {
    const neighbor = grid.get(q, r);

    if (neighbor && neighbor.rivers && tile && tile.rivers) {
      for (let self of tile.rivers) {
        for (let other of neighbor.rivers) {
          const sameRiver = self.riverIndex === other.riverIndex &&
            Math.abs(self.riverTileIndex - other.riverTileIndex) === 1;
          const otherRiver = self.riverIndex !== other.riverIndex && sameRiver;

          if (sameRiver || otherRiver) {
            return true;
          }
        }
      }

      return false;
    } else {
      // let the river run into the first ocean / lake
      if (neighbor && isWater(neighbor.height) && coastCount.count === 0) {
        coastCount.count++;
        return true;
      } else {
        return false;
      }
    }
  }

  computeRiverTextureIndex (grid, tile) {
    if (!tile.rivers) return 0;
    const coastCount = {count: 0};

    const NE = this.bitStr(this.isNextOrPrevRiverTile(grid, tile, tile.q + 1, tile.r - 1, coastCount));
    const E = this.bitStr(this.isNextOrPrevRiverTile(grid, tile, tile.q + 1, tile.r, coastCount));
    const SE = this.bitStr(this.isNextOrPrevRiverTile(grid, tile, tile.q, tile.r + 1, coastCount));
    const SW = this.bitStr(this.isNextOrPrevRiverTile(grid, tile, tile.q - 1, tile.r + 1, coastCount));
    const W = this.bitStr(this.isNextOrPrevRiverTile(grid, tile, tile.q - 1, tile.r, coastCount));
    const NW = this.bitStr(this.isNextOrPrevRiverTile(grid, tile, tile.q, tile.r - 1, coastCount));

    const combination = NE + E + SE + SW + W + NW;

    return parseInt(combination, 2);
  }

  static bitStr (x) {
    return x ? "1" : "0";
  }
}
