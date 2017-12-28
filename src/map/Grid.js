import { forEachRange, qrRange } from "../util/util";

export default class Grid {
  constructor (width, height) {
    if (width % 2 !== 0 || height % 2 !== 0) {
      throw new Error("With and height of grid must be divisible by 2")
    }
    this.data = [];
    this.width = width;
    this.height = height;
    this.halfWidth = this.width / 2;
    this.halfHeight = this.height / 2;

    this.NEIGHBOR_QRS = [
      { q: 1, r: -1 }, // NE
      { q: 1, r: 0 },  // E
      { q: 0, r: 1 },  // SE
      { q: -1, r: 1 }, // SW
      { q: -1, r: 0 }, // W
      { q: 0, r: -1 }  // NW
    ];
  }

  init(items) {
    items.forEach( (item) => {
      this.add(item.q, item.r, item)
    });
    return this
  }

  initQR(f) {
    return this.forEachQR((q,r,item) => this.add(q, r, f(q, r, item)));
  }

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
   * Iterates over the grid using the indices (i,j), where i = [0..width-1] and j = [0..height-1].
   * (0, 0) corresponds to the upper left corner, (width-1, height-1) to the bottom right corner.
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

  mapQR(f) {
    const mapped = new Grid(this.width, this.height);
    this.forEachQR((q,r,item) => mapped.add(q, r, f(q, r, item)));
    return mapped;
  }

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

  get (q, r) {
    const col = this.data[q];
    if (col) {
      return col[r]
    } else {
      return undefined
    }
  }

  getOrCreate(q, r, defaultValue) {
    const col = this.data[q];
    if (!col) {
      this.data[q] = [];
      this.data[q][r] = defaultValue;
      return defaultValue;
    }

    const cell = col[r];
    if (!cell) {
      this.data[q][r] = defaultValue;
      return defaultValue;
    }

    return cell;
  }

  add(q, r, item) {
    if (q in this.data) {
      this.data[q][r] = item;
    } else {
      const col = this.data[q] = [];
      col[r] = item;
    }
  }

  neighbors(q, r, range = 1) {
    return (range === 1 ? this.NEIGHBOR_QRS : qrRange(range)).map(qr => {
      return this.get(q + qr.q, r + qr.r)
    }).filter(x => x !== undefined);
  }

  /**
   * Returns a list of exactly 6 items for each of the surrounding tiles at (q,r).
   * Non-existing neighbors will occur as "undefined". The list is always returned
   * in the same order of NE [0], E [1], SE [2], SW [3], W [4], NW [5].
   * @param q
   * @param r
   * @returns {{q: number, r: number}[]}
   */
  surrounding (q, r) {
    return this.NEIGHBOR_QRS.map(qr => {
      return this.get(q + qr.q, r + qr.r)
    });
  }
}
