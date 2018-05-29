import {Vector2} from "three";
import BoundingBox from "./geometry/BoundingBox";

export default class QuadTree {

  constructor(data, capacity, pos, bounds) {
    this.northWest = null;
    this.northEast = null;
    this.southWest = null;
    this.southEast = null;
    this.bounds = null;

    this.data = [];
    this.capacity = capacity;
    this.pos = pos;

    if (bounds) {
      this.bounds = bounds;
    } else {
      const min = data.reduce((min, item) => min.min(pos(item)), pos(data[0]));
      const max = data.reduce((max, item) => max.max(pos(item)), pos(data[0]));
      const center = new Vector2().addVectors(min, max).multiplyScalar(0.5);
      const size = Math.max(max.x - min.x, max.y - min.y);

      this.bounds = new BoundingBox(center, size / 2);
    }

    if (data !== null) {
      data.forEach(this.insert.bind(this));
    }
  }

  isLeaf() {
    return !this.northWest;
  }

  insert(item) {
    const p = this.pos(item);

    if (!this.bounds.containsPoint(p)) {
      return false;
    }
    if (this.data !== null && this.data.length < this.capacity) {
      this.data.push(item);
      return true;
    }
    if(this.isLeaf()) {
      this.subdivide();
    }
    return this.northWest.insert(item) || this.northEast.insert(item) || this.southWest.insert(item) || this.southEast.insert(item);
  }

  subdivide () {
    let newBoundary = this.bounds.halfDimension / 2;
    let box = new BoundingBox({
      x: this.bounds.center.x - newBoundary,
      y: this.bounds.center.y + newBoundary,
    }, newBoundary);
    this.northWest = new QuadTree([], this.capacity, this.pos, box);

    box = new BoundingBox({
      x: this.bounds.center.x + newBoundary,
      y: this.bounds.center.y + newBoundary
    }, newBoundary);
    this.northEast = new QuadTree([], this.capacity, this.pos, box);

    box = new BoundingBox({
      x: this.bounds.center.x - newBoundary,
      y: this.bounds.center.y - newBoundary
    }, newBoundary);
    this.southWest = new QuadTree([], this.capacity, this.pos, box);

    box = new BoundingBox({
      x: this.bounds.center.x + newBoundary,
      y: this.bounds.center.y - newBoundary
    }, newBoundary);
    this.southEast = new QuadTree([], this.capacity, this.pos, box);

    this.data.forEach((item) => {
      this.northWest.insert(item) ||
      this.northEast.insert(item) ||
      this.southEast.insert(item) ||
      this.southWest.insert(item);
    });
    this.data = null;
  }

  /**
   * Returns a list of items within the given bounding box.
   */
  queryRange (range) {
    let pointsInRange = [];
    if(!this.bounds.intersectsAABB(range)) {
      return pointsInRange;
    }
    pointsInRange = this.data ? this.data.filter((item) => range.containsPoint(this.pos(item))) : [];
    if(this.isLeaf()) {
      return pointsInRange;
    }
    pointsInRange.push(...this.northWest.queryRange(range));
    pointsInRange.push(...this.northEast.queryRange(range));
    pointsInRange.push(...this.southWest.queryRange(range));
    pointsInRange.push(...this.southEast.queryRange(range));
    return pointsInRange;
  }

  mapReduce (f) {
    const data = this.data !== null ? f(this.data) : null;
    const center = new Vector2(this.bounds.center.x, this.bounds.center.y);
    const mapped = new QuadTree(data ? [data] : null, 1, (item) => center, this.bounds);

    if (this.northWest) mapped.northWest = this.northWest.mapReduce(f);
    if (this.northEast) mapped.northEast = this.northEast.mapReduce(f);
    if (this.southEast) mapped.southEast = this.southEast.mapReduce(f);
    if (this.southWest) mapped.southWest = this.southWest.mapReduce(f);

    return mapped;
  }
}
