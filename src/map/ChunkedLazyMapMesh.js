import { Object3D, Vector2, Vector3} from "three"
import QuadTree from "./QuadTree";
import { qrToWorld, screenToWorld} from '../util/coords';
import {BoundingBox} from "./BoundingBox";
import { range } from '../util/util';
import { MapMeshOptions } from './MapMesh';
import MapThunk from "./MapThunk";

export default class ChunkedLazyMapMesh extends Object3D {
  // readonly loaded: Promise<void>

  constructor(tileGrid, options) {
    super();

    this.quadtree = null;
    this.thunks = [];

    // we're gonna handle frustrum culling ourselves
    this.frustumCulled = false;

    // calculate size of map chunks so that there are at least 4 or each chunk contains 32^2 tiles
    const chunkSize = Math.min((tileGrid.width * tileGrid.height) / 4, Math.pow(32, 2));
    const chunkWidth = Math.ceil(Math.sqrt(chunkSize));
    const numChunksX = Math.ceil(tileGrid.width / chunkWidth);
    const numChunksY = Math.ceil(tileGrid.height / chunkWidth);
    const chunks = range(numChunksX).map(x => range(numChunksY).map(_ => []));

    // assign tiles to cells in the coarser chunk grid
    tileGrid.forEachIJ((i, j, q, r, tile) => {
      const bx = Math.floor((i / tileGrid.width) * numChunksX);
      const by = Math.floor((j / tileGrid.height) * numChunksY);
      chunks[bx][by].push(tile);
    });

    const promises = [];

    // create a thunk for each chunk
    chunks.forEach((row, x) => {
      row.forEach((tiles, y) => {
        const thunk = new MapThunk(tiles, tileGrid, options);
        this.thunks.push(thunk);
        promises.push(thunk.loaded);
        thunk.load(); // preload
        this.add(thunk);
      })
    });

    this.loaded = Promise.all(promises).then(() => null);
    this.quadtree = new QuadTree(this.thunks, 1, (thunk) => thunk.computeCenter());
  }

  numChunks() {
    return this.thunks.length
  }

  /**
   * Adjusts visibility of chunks so that only map parts that can actually be seen by the camera are rendered.
   * @param camera the camera to use for visibility checks
   */
  updateVisibility(camera) {
    const min = screenToWorld(0, 0, camera);
    const max = screenToWorld(window.innerWidth, window.innerHeight, camera);
    const center = new Vector3().addVectors(min, max).multiplyScalar(0.5);
    const size = Math.max(max.x - min.x, max.y - min.y);

    const boundingBox = new BoundingBox(new Vector2(center.x, center.y), size*2);
    this.thunks.forEach(thunk => thunk.updateVisibility(false));
    this.quadtree.queryRange(boundingBox).forEach(thunk => thunk.updateVisibility(true));
  }

  updateTiles(tiles) {
    this.thunks.forEach(thunk => thunk.updateTiles(tiles));
  }

  getTile(q, r) {
    const xy = qrToWorld(q, r);
    const queryBounds = new BoundingBox(xy, 1);
    const thunks = this.quadtree.queryRange(queryBounds);

    for (let thunk of thunks) {
      const tile = thunk.getTile(q, r);
      if (tile) {
        return tile
      }
    }

    return null
  }
}
