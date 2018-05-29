/**
 * @description
 * General shared utilities module
 *
 * @module util
 */
import { FileLoader, TextureLoader } from "three";
import { Options } from "../Options";

const fileLoader = new FileLoader();
const textureLoader = new TextureLoader();

/**
 * ????
 *
 * @param {number} qrRadius
 * @return {Array}
 * @memberOf module:util
 */
export function qrRange(qrRadius) {
  const coords = [];

  forEachRange(-qrRadius, qrRadius + 1, (dx) => {
    forEachRange(Math.max(-qrRadius, -dx - qrRadius), Math.min(qrRadius, -dx + qrRadius) + 1, (dy) => {
      let dz = -dx - dy;
      coords.push({q: dx, r: dz});
    })
  });

  return coords;
}

/**
 * Apply a function to each index in the range [min, max]. The function is
 * passed the index `i` as it's argument
 *
 * @deprecated
 * @param {number} min
 * @param {number} max
 * @param {function} f
 * @memberOf module:util
 * @todo this is redundant, replace usages with `range(min, max).forEach(f(v, i))
 */
export function forEachRange(min, max, f) {
  if (!max) {
    return range(0, min);
  } else {
    for (let i = min; i < max; i++) {
      f(i);
    }
  }
}

// export function shuffle(a) {
//   for (let i = a.length; i; i--) {
//     let j = Math.floor(Math.random() * i);
//     let x = a[i - 1];
//     a[i - 1] = a[j];
//     a[j] = x;
//   }
//   return a
// }

/**
 * Generate a range of numbers.
 *
 * If one argument is passed it will be the max of the range and the range
 * will be [0, max]. If two arguments are passed they will be min and max
 * respectively and the range will be [min, max].
 *
 * @param {number} minOrMax
 * @param {number} max
 * @return {Array}
 */
export function range(minOrMax, max) {
  if (!max) {
    return this.range(0, minOrMax);
  } else {
    let values = [];
    for (let i = minOrMax; i < max; i++) {
      values.push(i);
    }
    return values;
  }
}

export function flatMap(items, map) {
  return [].concat.apply([], items.map(map));
}

export function sum(numbers) {
  return numbers.reduce((sum, item) => sum + item, 0);
}

export function qrEquals(a, b) {
  return a.q === b.q && a.r === b.r;
}

export function minBy(items, by) {
  if (items.length === 0) {
    return null;
  } else if (items.length === 1) {
    return items[0];
  } else {
    return items.reduce((min, cur) => by(cur) < by(min) ? cur : min, items[0]);
  }
}

export function isInteger(value) {
  return Math.floor(value) === value;
}

export function flatten(items) {
  return [].concat.apply([], items);
}

// export function varying(values) {
//   return values[Math.round(Math.random() * (values.length - 1))]
// }

export function sortByHeight(tiles) {
  return tiles.sort((a, b) => b.height - a.height);
}

export function contains(t, ts) {
  for (let other of ts) {
    if (other.q === t.q && other.r === t.r) {
      return true
    }
  }
  return false
};

export function loadTextureAsync(url, onProgress) {
  return new Promise((resolve, reject) => {
    const onLoad = (texture) => {
      resolve(texture)
    };

    const onProgressWrapper = (progress) => {
      if (onProgress) {
        onProgress(100 * (progress.loaded / progress.total), progress.total, progress.loaded)
      }
    };

    const onError = (error) => {
      reject(error)
    };

    textureLoader.load(url, onLoad, onProgressWrapper, onError);
  })
}

export function loadFile(path) {
  // TODO: Remove cache buster
  const url = path// + "?cachebuster=" + Math.random() * 9999999
  return new Promise((resolve, reject) => {
    fileLoader.load(url, (result) => {
      resolve(result)
    }, undefined, (error) => {
      reject(error)
    })
  })
}

export async function loadJSON(path) {
  return loadFile(path).then(str => JSON.parse(str));
}

export function asyncLoadTexture (name) {
  return new Promise((resolve, reject) => {
    textureLoader.load(assetPath(name),
      (texture) => {                          // onLoad
        texture.name = name;
        resolve(texture);
      },
      (xhr) => {},                            // onProgress
      (error) => { reject(new Error(error)) } // onError
    )
  });
}

export function loadTexture (name) {
  const texture = textureLoader.load(assetPath(name));
  texture.name = name;
  return texture;
}

export function assetPath (relativePath) {
  return Options.texturePath + relativePath;
}

export async function loadTextureAtlas () {
  return loadJSON(assetPath("land-atlas.json"));
}
