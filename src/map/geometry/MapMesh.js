/**
 * @author Chad Rempp <crempp@gmail.com>
 * @copyright 2018 Chad Rempp
 */
import {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  RawShaderMaterial,
  Vector3,
  Vector4,
  Mesh,
  Group,
  Color,
  FrontSide,
} from "three"
import {qrToWorld} from '../../util/coords';
import { Options } from "../../Options";
import Hexagon from "./Hexagon"
import Grid from "../Grid";
import { LAND_FRAGMENT_SHADER } from '../../shaders/land.fragment';
import { LAND_VERTEX_SHADER } from '../../shaders/land.vertex';
import { MOUNTAINS_FRAGMENT_SHADER } from '../../shaders/mountains.fragment';
import { MOUNTAINS_VERTEX_SHADER } from "../../shaders/mountains.vertex";
import Forests from "../Forests";


/**
 * @classdesc
 * MapMesh does a foo bar asdfasd asdf asdf asdfaf dsasdf
 *
 * @extends three.Group
 * @memberOf module:map
 */
class MapMesh extends Group {
  /**
   * @constructor
   * @param {Array} tiles the tiles to actually render in this mesh
   * @param globalGrid the grid with all tiles, including the ones that are not rendered in this mesh
   * @param {Object} assets
   */
  constructor(tiles, globalGrid, assets) {
    super();

    /** **/
    this.assets = assets;

    /** */
    this.land = null;

    /** */
    this.mountains = null;

    /** */
    this.trees = null;

    /** */
    this.boundingSphere = null;

    /** @private */
    this.showGrid = true;

    /** List of tiles displayed in this mesh */
    this.tiles = tiles;

    /** Grid of the tiles displayed in this mesh containing the same elements as this.tiles */
    this.localGrid = new Grid(0, 0).init(this.tiles);

    /** Global grid of all tiles, even the ones not displayed in this mesh */
    this.globalGrid = globalGrid || this.localGrid;

    // this.hillsNormalTexture.wrapS = this.hillsNormalTexture.wrapT = RepeatWrapping;
    // this.terrainAtlasTexture.wrapS = this.terrainAtlasTexture.wrapT = RepeatWrapping;
    // this.undiscoveredTexture.wrapS = this.undiscoveredTexture.wrapT = RepeatWrapping;
    // //this.transitionTexture.flipY = true

    let notMountainTiles = this.tiles.filter(t => !t.isMountain);
    let mountainTiles = this.tiles.filter(t => t.isMountain)
    this.loaded = Promise.all([
      this.createLandMesh(notMountainTiles),
      this.createMountainMesh(mountainTiles),
      this.createTrees()
    ])
    //   .catch((err) => {
    //   console.error("Could not create MapMesh", err)
    // });
  }

  /**
   *
   * @return {boolean}
   */
  get showGrid() {
    return this.showGrid
  }

  /**
   *
   * @param value
   */
  set showGrid(value) {
    this.showGrid = value;

    const landMaterial = this.land.material;
    landMaterial.uniforms.showGrid.value = value ? 1.0 : 0.0;

    const mountainMaterial = this.mountains.material;
    mountainMaterial.uniforms.showGrid.value = value ? 1.0 : 0.0;
  }


  /**
   * "Hot-swaps" the given textures.
   *
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

  /**
   *
   * @param tiles
   */
  updateTiles(tiles) {
    this.updateFogAndClouds(tiles);
    this.trees.updateTiles(tiles);
  }

  /**
   *
   * @param q
   * @param r
   */
  getTile(q, r) {
    return this.localGrid.get(q, r);
  }

  /**
   * Updates only fog and clouds visualization of existing tiles.
   *
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

  /**
   *
   * @param attr
   * @param index
   * @param fog
   * @param clouds
   */
  static updateFogStyle (attr, index, fog, clouds) {
    const style = attr.getY(index);
    const fogMask = 0b1;
    const newStyle = fog ? (style | fogMask) : (style & ~fogMask);
    const withClouds = !clouds ? newStyle % 100 : 100 + newStyle;

    attr.setY(index, withClouds);
  }

  /**
   *
   * @async
   * @return {Promise.<void>}
   */
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

  /**
   * @async
   * @param tiles
   * @return {Promise.<void>}
   */
  async createLandMesh(tiles) {
    const atlas = this.assets.terrainAtlas;
    const geometry = this.createHexagonTilesGeometry(tiles, this.globalGrid, 0);
    const material = new RawShaderMaterial({
      uniforms: {
        sineTime: {value: 0.0},
        showGrid: {value: this.showGrid ? 1.0 : 0.0},
        camera: {type: "v3", value: new Vector3(0, 0, 0)},
        texture: {type: "t", value: this.assets.textureTerrain},
        textureAtlasMeta: {
          type: "4f",
          value: new Vector4(atlas.width, atlas.height, atlas.cellSize, atlas.cellSpacing)
        },
        hillsNormal: {
          type: "t",
          value: this.assets.textureHillsNormal
        },
        coastAtlas: {
          type: "t",
          value: this.assets.textureCoastDiffuse
        },
        riverAtlas: {
          type: "t",
          value: this.assets.textureRiverDiffuse
        },
        mapTexture: {
          type: "t",
          value: this.assets.texturePaper
        },
        transitionTexture: {
          type: "t",
          value: this.assets.textureTransitions
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

    // Add to group
    this.add(this.land);
  }

  /**
   * @async
   * @param tiles
   * @return {Promise.<void>}
   */
  async createMountainMesh(tiles) {
    const atlas = this.assets.terrainAtlas;
    const geometry = this.createHexagonTilesGeometry(tiles, this.globalGrid, 1);
    const material = new RawShaderMaterial({
      uniforms: {
        sineTime: {value: 0.0},
        showGrid: {value: this.showGrid ? 1.0 : 0.0},
        camera: {type: "v3", value: new Vector3(0, 0, 0)},
        texture: {type: "t", value: this.assets.textureTerrain},
        textureAtlasMeta: {
          type: "4f",
          value: new Vector4(atlas.width, atlas.height, atlas.cellSize, atlas.cellSpacing)
        },
        hillsNormal: {
          type: "t",
          value: this.assets.textureHillsNormal
        },
        mapTexture: {
          type: "t",
          value: this.assets.texturePaper
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
    const textureAtlas = this.assets.terrainAtlas;

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
    // const cellSpacing = textureAtlas.cellSpacing;
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

  /**
   *
   * @param grid
   * @param tile
   * @return {*}
   */
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

export default MapMesh;
