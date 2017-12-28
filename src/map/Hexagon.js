import { Vector3, BufferGeometry, BufferAttribute } from "three"

export default class Hexagon {
  constructor (radius, numSubdivisions) {
    this.NE = 0b100000;
    this.E  = 0b010000;
    this.SE = 0b001000;
    this.SW = 0b000100;
    this.W  = 0b000010;
    this.NW = 0b000001;

    let numFaces = 6 * Math.pow(4, numSubdivisions);
    let positions = new Float32Array(numFaces * 3 * 3), p = 0;
    let texcoords = new Float32Array(numFaces * 3 * 2), t = 0;
    let border = new Float32Array(numFaces * 3), e = 0;

    let points = [0, 1, 2, 3, 4, 5].map((i) => {
      return new Vector3(
        radius * Math.sin(Math.PI * 2 * (i / 6.0)),
        radius * Math.cos(Math.PI * 2 * (i / 6.0)),
        0
      )
    }).concat([new Vector3(0, 0, 0)]);

    let faces = [0, 6, 1, 1, 6, 2, 2, 6, 3, 3, 6, 4, 4, 6, 5, 5, 6, 0];
    let vertices = []; // every three vertices constitute one face
    for (let i = 0; i < faces.length; i += 3) {
      let a = points[faces[i]];
      let b = points[faces[i + 1]];
      let c = points[faces[i + 2]];
      vertices = vertices.concat(this.subdivideTriangle(a, b, c, numSubdivisions))
    }

    for (let i = 0; i < vertices.length; i++) {
      positions[p++] = vertices[i].x;
      positions[p++] = vertices[i].y;
      positions[p++] = vertices[i].z;

      texcoords[t++] = 0.02 + 0.96 * ((vertices[i].x + radius) / (radius * 2));
      texcoords[t++] = 0.02 + 0.96 * ((vertices[i].y + radius) / (radius * 2));

      let inradius = (Math.sqrt(3) / 2) * radius;
      border[e++] = vertices[i].length() >= inradius - 0.1 ? 1.0 : 0.0
    }

    this.geometry = new BufferGeometry();
    this.geometry.addAttribute("position", new BufferAttribute(positions, 3));
    this.geometry.addAttribute("uv", new BufferAttribute(texcoords, 2));

    // 1.0 = border vertex, 0.0 otherwise
    this.geometry.addAttribute("border", new BufferAttribute(border, 1));
  }

  /**
   * subdivideTriangle
   *
   * @param a Vector3
   * @param b Vector3
   * @param c Vector3
   * @param numSubdivisions number
   * @returns Vector3[]
   */
  subdivideTriangle (a, b, c, numSubdivisions) {
    if ((numSubdivisions || 0) <= 0) return [a, b, c];

    let ba = b.clone().sub(a);
    let ah = a.clone().add(ba.setLength(ba.length() / 2));

    let cb = c.clone().sub(b);
    let bh = b.clone().add(cb.setLength(cb.length() / 2));

    let ac = a.clone().sub(c);
    let ch = c.clone().add(ac.setLength(ac.length() / 2));

    return [].concat(
      this.subdivideTriangle(ah, bh, ch, numSubdivisions - 1),
      this.subdivideTriangle(ch, bh, c, numSubdivisions - 1),
      this.subdivideTriangle(ah, ch, a, numSubdivisions - 1),
      this.subdivideTriangle(bh, ah, b, numSubdivisions - 1)
    )
  }

  /**
   * Returns a random point in the regular hexagon at (0,0) with given hex radius on the Z=0 plane.
   */
  static randomPointInHexagon(hexRadius, modifier) {
    // the hexagon consists of 6 triangles, construct one of them randomly
    let startCornerIndex = Math.floor(Math.random() * 6);
    const A = hexagonCorners[startCornerIndex].clone();
    const B = new Vector3(0, 0, 0);
    const C = hexagonCorners[(startCornerIndex + 1) % 6].clone();

    // random point in the triangle based on AB and AC
    let r = Math.random(), s = Math.random();
    let rSqrt = Math.sqrt(r), sSqrt = Math.sqrt(s);

    const point = A.multiplyScalar((1 - rSqrt))
      .add(B.multiplyScalar(rSqrt*(1 - sSqrt)))
      .add(C.multiplyScalar(s*rSqrt));

    return point.multiplyScalar(modifier(startCornerIndex) * hexRadius);
  }

  static computeHexagonCorner(angle) {
    const radius = 1.0;
    return new Vector3(radius * Math.sin(Math.PI * 2 * angle), radius * Math.cos(Math.PI * 2 * angle), 0);
  }
}

const hexagonCorners = [
  Hexagon.computeHexagonCorner(0),
  Hexagon.computeHexagonCorner(1 / 6.0),
  Hexagon.computeHexagonCorner(2 / 6.0),
  Hexagon.computeHexagonCorner(3 / 6.0),
  Hexagon.computeHexagonCorner(4 / 6.0),
  Hexagon.computeHexagonCorner(5 / 6.0)
];
