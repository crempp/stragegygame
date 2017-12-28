import {
  Object3D,
  // Texture,
  Points,
  // PointsMaterial,
  BufferAttribute,
  BufferGeometry,
  Vector3,
  // Color,
  // ShaderMaterial,
  RawShaderMaterial
} from "three";
import Grid from "./Grid";
import { flatMap } from "../util/util";
import { qrToWorld } from "../util/coords";
import { TREES_VERTEX_SHADER } from "../shaders/trees.vertex";
import { TREES_FRAGMENT_SHADER } from "../shaders/trees.fragment";
import Map from "./Map";

// interface ForestTile extends TileData {
//   bufferIndex: number;
// }
//
// export interface Options {
//   /**
//    * Scaling factor for tile size, e.g. 1.0 if the tile size is not changed.
//    */
//   mapScale: number;
//
//   /**
//    * Size of trees > 0.0.
//    */
//   treeSize: number;
//
//   /**
//    * Spritesheet with n columns and rows, where n equals the option spritesheetSubdivisions.
//    */
//   spritesheet: Texture;
//
//   /**
//    * Number of spritesheet subdivisions, i.e. columns and rows.
//    */
//   spritesheetSubdivisions: number;
//
//   /**
//    * Number of trees that are rendered per forest by default.
//    */
//   treesPerForest: number;
//
//   /**
//    * Parts of the tree sprite whose opacity is lower than this value will not be rendered,
//    * i.e. the transparent background. Valid values are between 0.0 and 1.0.
//    */
//   alphaTest: number;
//
//   /**
//    * Options per tree index to vary individual tree types.
//    */
//   treeOptions?: {
//     /**
//      * Tree size scale (1.0 by default)
//      */
//     scale?: number;
//
//   /**
//    * Number of trees per forest
//    */
//   treesPerForest: number;
// }[];
// }

export default class Forests extends Object3D {

  constructor(tiles, globalGrid, options) {
    super();

    this._forestTiles = tiles.filter(t => typeof t.treeIndex !== "undefined")
      .map(t => ({bufferIndex: -1, ...t}));
    this._globalGrid = globalGrid;
    this._options = {...options};

    this._trees = new Trees(globalGrid, this._forestTiles, options);
    this.add(this._trees);
  }

  updateTiles(tiles) {
    this._trees.updateTiles(tiles.filter(t => typeof t.treeIndex !== "undefined"))
  }
}

class Trees extends Object3D {

  constructor(globalGrid, tiles, options) {
    super();

    this._points = null;
    this._options = null;
    this._alphaAttr = null;
    this._globalGrid = globalGrid;
    this._grid = new Grid(0, 0).init(tiles);
    this._texture = options.spritesheet;
    this._tiles = tiles;
    this._options = options;

    this.create()
  }

  updateTiles(tiles) {
    const attr = this._alphaAttr;

    for (let updated of tiles) {
      const old = this._grid.get(updated.q, updated.r);
      const val = updated.clouds ? 0 : 1;
      if (updated.clouds === old.clouds) continue;

      for (let i = 0; i < this._options.treesPerForest; i++) {
        attr.setZ(old.bufferIndex + i, val);
      }

      old.clouds = updated.clouds;
    }

    attr.needsUpdate = true;
  }

  create() {
    this._points = new Points(this.createGeometry(), this.createMaterial());
    this.add(this._points);
  }

  treeSize(treeIndex) {
    if (this._options.treeOptions && typeof this._options.treeOptions[treeIndex] !== "undefined") {
      return (this._options.treeOptions[treeIndex].scale || 1.0) * this._options.treeSize;
    } else {
      return this._options.treeSize;
    }
  }

  numTreesPerForest(treeIndex) {
    if (this._options.treeOptions && typeof this._options.treeOptions[treeIndex] !== "undefined") {
      return this._options.treeOptions[treeIndex].treesPerForest;
    } else {
      return this._options.treesPerForest;
    }
  }

  createGeometry() {
    const geometry = new BufferGeometry();
    const {treeSize, mapScale} = this._options;

    // tree positions
    const positions = flatMap(this._tiles, (tile, j) => {
      const treesPerForest = this.numTreesPerForest(tile.treeIndex);
      tile.bufferIndex = j * treesPerForest;
      const vs = new Array(treesPerForest);

      for (let i = 0; i < treesPerForest; i++) {
        const tilePos = qrToWorld(tile.q, tile.r, mapScale);
        const localPos = Map.randomPointOnCoastTile(Map.waterAdjacency(this._globalGrid, tile), mapScale);
        vs[i] = tilePos.add(localPos).setZ(0.12);
      }

      return vs
    });

    const posAttr = new BufferAttribute(new Float32Array(positions.length * 3), 3).copyVector3sArray(positions);
    geometry.addAttribute("position", posAttr);

    // tree parameters
    const cols = this._options.spritesheetSubdivisions;

    const params = flatMap(this._tiles, tile => {
      const spriteIndex = () => tile.treeIndex * cols + Math.floor(Math.random() * cols);
      const treesPerForest = this.numTreesPerForest(tile.treeIndex);
      const treeSize = this.treeSize(tile.treeIndex);
      const ps = new Array(treesPerForest);

      for (let i = 0; i < treesPerForest; i++) {
        ps[i] = new Vector3(spriteIndex(), treeSize, tile.clouds ? 0.0 : 1.0);
      }

      return ps;
    });
    this._alphaAttr = new BufferAttribute(new Float32Array(positions.length * 3), 3).copyVector3sArray(params);
    geometry.addAttribute("params", this._alphaAttr);

    return geometry;
  }

  createMaterial() {
    const {treeSize, mapScale, spritesheetSubdivisions} = this._options;
    const parameters = {
      uniforms: {
        texture: {
          type: "t",
          value: this._texture
        },
        spritesheetSubdivisions: { type: "f", value: spritesheetSubdivisions },
        size: {
          type: "f",
          value: (this._options.mapScale || 1.0) * this._options.treeSize
        },
        scale: { type: 'f', value: window.innerHeight / 2 },
        alphaTest: { type: 'f', value: this._options.alphaTest }
      },
      transparent: true,
      vertexShader: TREES_VERTEX_SHADER,
      fragmentShader: TREES_FRAGMENT_SHADER
    };
    return new RawShaderMaterial(parameters);
  }
}
