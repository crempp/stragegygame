import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer
} from "three";
import seedrandom from "seedrandom";
// import Map from "./map/Map";
import NewMap from "./map/NewMap";
import DebugGUI from "./gui/debug";
import { Options } from "./Options";
import { mouseToWorld, qrToWorld } from "./util/coords";
import {
  seednoise,
} from "./util/random";

export default class Game {
  constructor () {

    // Setup Canvas
    this.canvas = document.querySelector(Options.canvasElementQuery);

    // Setup Camera
    this.camera = new PerspectiveCamera(
      // fov — Camera frustum vertical field of view.
      Options.fov,
      // aspect — Camera frustum aspect ratio.
      window.innerWidth / window.innerHeight,
      // near — Camera frustum near plane.
      Options.near,
      // far — Camera frustum far plane.
      Options.far
    );
    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 400;

    this.camera.rotation.x = Math.PI / 4.5;
    //this.setZoom(Options.camera.zoom);
    this.focus(0, 0);

    // Setup Scene
    this.scene = new Scene();

    // Setup Renderer
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      devicePixelRatio: window.devicePixelRatio
    });
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    if (this.renderer.extensions.get('ANGLE_instanced_arrays') === false) {
      throw new Error("Your browser is not supported (missing extension ANGLE_instanced_arrays)")
    }
    this.renderer.setClearColor(Options.clearColor);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // TODO: Find a better way to pass this stuff around
    const three = {
      camera: this.camera,
      canvas: this.canvas,
      renderer: this.renderer,
      scene: this.scene,
    };

    window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

    // setup random seeds
    this.seed = "435632452345";
    seedrandom(this.seed, { global: true });
    seednoise(this.seed);

    // Create the map
    this.map = new NewMap(three);

    // DEBUG
    window.three = three;
    this.debugGUI = new DebugGUI(three);
  }

  onWindowResize () {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  // animate() {
  //   this.map.animate();
  // }
  //
  // /**
  //  * Sets up the camera with the given Z position (height) and so that the view
  //  * center (the point the camera is pointed at) doesn't change.
  //  */
  // setZoom(z) {
  //   this.camera.updateMatrixWorld(false);
  //
  //   // position the camera is currently centered at
  //   const lookAt = this.getViewCenter();
  //
  //   // move camera along the Z axis to adjust the view distance
  //   this.zoom = z;
  //   this.camera.position.z = z
  //   this.camera.updateMatrixWorld(true);
  //
  //   if (lookAt !== null) {
  //     // reposition camera so that the view center stays the same
  //     this.camera.position.copy(this.getCameraFocusPositionWorld(lookAt))
  //   }
  //
  //   return this;
  // }
  //
  // /**
  //  * Returns the world space position on the Z plane (the plane with the tiles)
  //  * at the center of the view.
  //  */
  // getViewCenter() {
  //   let c =  mouseToWorld({
  //     clientX: window.innerWidth / 2,
  //     clientY: window.innerHeight / 2
  //   }, this.camera);
  //   return c;
  // }
  //
  // getCameraFocusPosition(pos) {
  //   return this.getCameraFocusPositionWorld(qrToWorld(pos.q, pos.r))
  // }
  //
  // getCameraFocusPositionWorld(pos) {
  //   const currentPos = this.camera.position.clone();
  //   const viewCenter = this.getViewCenter();
  //   const viewOffset = currentPos.sub(viewCenter);
  //
  //   return pos.add(viewOffset);
  // }
  //
  focus(q, r) {
    this.camera.position.copy(this.getCameraFocusPosition({q, r}))
  }

}
