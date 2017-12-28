import { Object3D, Vector2, Vector3, Sphere } from "three"
import { qrToWorldX, qrToWorldY } from '../util/coords';
import MapMesh from "./MapMesh";
// import BoundingBox from "./BoundingBox";

export default class MapThunk extends Object3D {

  constructor(tiles, grid) {
    super();
    this._loaded = false;
    this.loaded = new Promise((resolve, reject) => {
      this.resolve = resolve
    });
    this.frustumCulled = false;
    this.mesh = null;
    this.resolve = () => {};
  }

  getTiles () {
    return this.tiles;
  }

  getTile (q, r) {
    return this.mesh.getTile(q, r);
  }

  computeCenter () {
    const sphere = new Sphere();
    sphere.setFromPoints(this.tiles.map(tile => new Vector3(qrToWorldX(tile.q, tile.r), qrToWorldY(tile.q, tile.r))));
    return new Vector2(sphere.center.x, sphere.center.y);
  }

  updateTiles(tiles) {
    if (!this.mesh) {
      this.load();
    }

    this.mesh.updateTiles(tiles);
  }

  load() {
    if (!this._loaded) {
      this._loaded = true;
      const mesh = this.mesh = new MapMesh(this.tiles, this.grid);
      mesh.frustumCulled = false;

      this.add(mesh);
      this.resolve();
    }
  }

  updateVisibility(value) {
    if (value && !this._loaded) {
      this.load();
    }
    this.visible = value;
  }
}
