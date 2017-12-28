import { Color } from "three";

export const Options = {
  texturePath: "textures/",
  canvasElementQuery: "canvas",
  clearColor: 0x6495ED,
  camera: {
    fov: 30,
    near: 1,
    far: 10000,
    zoom: 25,
  },
  map: {
    mapSize: 96,

    /**
     * Number of horizontal and vertical spritesheet subdivisions
     */
    treeSpritesheetSubdivisions: 4,

    /**
     *
     */
    treesPerForest: 50,

    /**
     * Width of the grid lines as a normalized scaling factor relative to the area of the tile.
     * Default: 0.02 (2%)
     */
    gridWidth: 0.025,

    /**
     * Color of the hex grid
     * Default: 0xffffff (white)
     */
    gridColor: new Color(0x42322b),

    /**
     * Opacity between 0.0 (invisible) and 1.0 (opaque).
     * Default value: 0.33 (33%)
     */
    gridOpacity: 0.25,

    /**
     *
     */
    treeSize: 1.44,

    /**
     * Parts of the tree sprite whose opacity is lower than this value will not be rendered,
     * i.e. the transparent background. Valid values are between 0.0 and 1.0. Default is 0.2.
     */
    treeAlphaTest: 0.2,

    // options per tree index, varying the different kinds of trees a little
    treeOptions: [
      undefined, // leave default options for trees with index 0 (temperate zone forests)
      { // tundra trees
        treesPerForest: 25
      },
      { // snowy trees
        treesPerForest: 10,
        scale: 0.85
      } // no options for tropical forests (index = 3)
    ]
  }
};
