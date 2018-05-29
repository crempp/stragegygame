/**
 * @description
 * The Map module contains all the classes used to generate a hex map for the
 * game
 *
 * @module newmap
 */
import { RepeatWrapping } from "three";
import MapGenerator from "./generators/MapGenerator";
import MapMesh from "./geometry/MapMesh";
import ChunkedLazyMapMesh from "./geometry/ChunkedLazyMapMesh";
import {
  loadTextureAtlas,
  asyncLoadTexture,
} from "../util/util";

/**
 * @classdesc
 * Map does a foo bar asdfasd asdf asdf asdfaf dsasdf
 *
 * @memberOf module:newmap
 */
class NewMap {
  /**
   * @constructor
   * @param three
   */
  constructor(three) {
    /** An object containing all of the maps textures and assets */
    this.assets = null;

    /** The map's tile grid */
    this.grid = null;

    /** The map's MapMesh object group */
    this.mapMesh = null;

    /** The size of the map (width and height) in tiles */
    this.mapSize = 96;

    /** The type of MapMesh to be used for the map. The options are MESH and CHUNKED_MESH */
    this.meshType = "MESH";

    /** The currently selected tile on the map */
    this.selectedTile = null;

    /** A reference to the three.js objects */
    this.three = three;

    /** A shortcut to the Grid's tile array */
    this.tiles = null;

    if (Math.pow(this.mapSize, 1) >= Math.pow(512, 2)) {
      this.meshType = "CHUNKED_MESH";
    }
  }

  /**
   *
   * @return {Promise.<void>}
   */
  async load () {
    const generator = new MapGenerator(this.mapSize);
    this.grid = generator.generate();
    this.tiles = this.grid.data;

    await this.loadAssets().then((assets) => {
      this.assets = assets;

      this.selectedTile = this.grid.get(0, 0);

      if (this.meshType === "MESH") {
        this.mapMesh = new MapMesh(this.tiles, null, this.assets.terrainAtlas);
        this.mapMesh.loaded.then(() => {
          // if (this.onMeshLoaded) this.onMeshLoaded();
          console.log("Mesh Loaded")
        });
        console.info("using single MapMesh for " + (tiles.width * tiles.height) + " tiles")
      } else if (this.meshType === "CHUNKED_MESH"){
        // TODO
      }
    });
  }

  /**
   *
   * @return {Promise}
   */
  async loadAssets () {
    let assetPromises = [];
    assetPromises.push(loadTextureAtlas());              // textureAtlas
    assetPromises.push(asyncLoadTexture("terrain.png")); // terrain texture
    assetPromises.push(asyncLoadTexture("clouds.jpg"));
    assetPromises.push(asyncLoadTexture("paper.jpg"));
    assetPromises.push(asyncLoadTexture("transitions.png"));
    assetPromises.push(asyncLoadTexture("trees.png"));
    assetPromises.push(asyncLoadTexture("coast-diffuse.png"));
    assetPromises.push(asyncLoadTexture("hills-ambient.png"));
    assetPromises.push(asyncLoadTexture("hills-normal.png"));
    assetPromises.push(asyncLoadTexture("river-diffuse.png"));

    let results = await Promise.all(assetPromises);

    const assets = {
      terrainAtlas:        results[0],
      textureTerrain:      results[1],
      textureClouds:       results[2],
      texturePaper:        results[3],
      textureTransitions:  results[4],
      textureTrees:        results[5],
      textureCoastDiffuse: results[6],
      textureHillsAmbient: results[7],
      textureHillsNormal:  results[8],
      textureRiverDiffuse: results[9],
    };

    // Set texture wrapping
    assets.textureHillsNormal.wrapS = RepeatWrapping;
    assets.textureHillsNormal.wrapT = RepeatWrapping;
    assets.textureTerrain.wrapS = RepeatWrapping;
    assets.textureTerrain.wrapT = RepeatWrapping;
    assets.texturePaper.wrapS = RepeatWrapping;
    assets.texturePaper.wrapT = RepeatWrapping;

    return assets;
  }
}

export default NewMap;
