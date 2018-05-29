// import Game from "./Game";
//
// const game = new Game();
// game.animate();

////////////////////////////////////////////
// TESTING
////////////////////////////////////////////
import seedrandom from "seedrandom";
import {
  seednoise,
} from "./util/random";


import NewMap from "./map/NewMap";

/**
 * setup random seeds
 */
const seed = "435632452345";
seedrandom(seed, { global: true });
seednoise(seed);

const map = new NewMap();
let p = map.load();
p.then(() => {
  console.log("loaded", map);
});

console.log("done");
