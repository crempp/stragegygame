import { screenToWorld, pickingRay, qrToWorld } from "../util/coords";
import { Vector3, Camera, Vector2 } from "three";
import Animation from "./Animation";

export default class Controller {

  constructor (map, three) {
    this.map = map;
    this.three = three;

    this.pickingCamera = null;
    this.mouseDownPos = null;
    this.dragStartCameraPos = null;
    this.lastDrag = null;
    this.debugText = null;
    this.selectedQR = {q: 0, r: 0};
    this.animations = [];

    this.scrollDir = new Vector3(0, 0, 0);

    document.addEventListener("keydown", this.onKeyDown, false);
    this.three.canvas.addEventListener("mousedown", this.onMouseDown.bind(this), false);
    this.three.canvas.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    this.three.canvas.addEventListener("mouseup", this.onMouseUp.bind(this), false);
    this.three.canvas.addEventListener("mouseout", this.onMouseOut.bind(this), false);
    this.three.canvas.addEventListener("mouseenter", this.onMouseEnter.bind(this), false);

    this.three.canvas.addEventListener("touchstart", (e) => {
      this.onMouseDown(e.touches[0]);
      e.preventDefault();
    }, false);
    this.three.canvas.addEventListener("touchmove", (e) => {
      this.onMouseMove(e.touches[0]);
      e.preventDefault();
    }, false);
    this.three.canvas.addEventListener("touchend", (e) => {
      this.onMouseUp(e.touches[0] || e.changedTouches[0]);
    }, false);

    // setInterval(() => this.showDebugInfo(), 200);

    // this.controls.setOnAnimateCallback(this.onAnimate);
  }


  // set debugOutput(elem: HTMLElement | null) {
  //   this.debugText = elem
  // }

  setScrollDir (x, y) {
    this.scrollDir.setX(x);
    this.scrollDir.setY(y);
    this.scrollDir.normalize();
  }

  onAnimate (dtS) {
    const animations = this.animations;

    for (let i = 0; i < animations.length; i++) {
      // advance the animation
      const animation = animations[i];
      const finished = animation.animate(dtS);

      // if the animation is finished (returned true) remove it
      if (finished) {
        // remove the animation
        animations[i] = animations[animations.length - 1];
        animations[animations.length-1] = animation;
        animations.pop();
      }
    }
  }

  addAnimation(animation) {
    this.animations.push(animation);
  }

  onKeyDown (e) {
    if (e.keyCode === 32) { // SPACE BAR
      console.log(`center view on QR(${this.selectedQR.q},${this.selectedQR.r})`)
      this.panCameraTo(this.selectedQR, 600 /*ms*/)
    }
  }

  onMouseDown (e) {
    this.pickingCamera = this.three.camera.clone();
    this.mouseDownPos = screenToWorld(e.clientX, e.clientY, this.pickingCamera);
    this.dragStartCameraPos = this.three.camera.position.clone();
  }

  onMouseEnter (e) {
    if (e.buttons === 1) {
      this.onMouseDown(e);
    }
  }

  onMouseMove (e) {
    // scrolling via mouse drag
    if (this.mouseDownPos) {
      const mousePos = screenToWorld(e.clientX, e.clientY, this.pickingCamera);
      const dv = this.lastDrag = mousePos.sub(this.mouseDownPos).multiplyScalar(-1);

      const newCameraPos = dv.clone().add(this.dragStartCameraPos);
      this.three.camera.position.copy(newCameraPos);
    }

    // scrolling via screen edge only in fullscreen mode
    if (window.innerHeight === screen.height && !this.mouseDownPos) {
      const scrollZoneSize = 20;
      const mousePos2D = new Vector2(e.clientX, e.clientY);
      const screenCenter2D = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
      const diff = mousePos2D.clone().sub(screenCenter2D);

      if (Math.abs(diff.x) > screenCenter2D.x - scrollZoneSize || Math.abs(diff.y) > screenCenter2D.y - scrollZoneSize) {
        this.setScrollDir(diff.x, -diff.y);
      } else {
        this.setScrollDir(0, 0);
      }
    }
  }

  onMouseUp (e) {
    if (!this.lastDrag || this.lastDrag.length() < 0.1) {
      const mousePos = screenToWorld(e.clientX, e.clientY, this.three.camera);
      const tile = this.map.pickTile(mousePos);
      if (tile) {
        this.map.selectTile(tile);
        this.selectedQR = tile;
        this.showDebugInfo();
      }
    }

    this.mouseDownPos = null ;// end drag
    this.lastDrag = null;
  }

  onMouseOut (e) {
    this.mouseDownPos = null; // end drag
    this.setScrollDir(0, 0);
  }

  showDebugInfo() {
    if (this.debugText === null) {
      return;
    }

    const tileQR = this.selectedQR;
    const tileXYZ = qrToWorld(tileQR.q, tileQR.r); // world space
    const camPos = this.map.getViewCenter(); //  this.controls.getCamera().position
    const tile = this.map.pickTile(tileXYZ);

    // this.debugText.innerHTML = `Selected Tile: QR(${tileQR.q}, ${tileQR.r}),
    //         XY(${tileXYZ.x.toFixed(2)}, ${tileXYZ.y.toFixed(2)})
    //         &nbsp; &bull; &nbsp; Camera Looks At (Center): XYZ(${camPos.x.toFixed(2)}, ${camPos.y.toFixed(2)}, ${camPos.z.toFixed(2)})`
  }

  panCameraTo(qr, durationMs) {
    const from = this.three.camera.position.clone();
    const to = this.map.getCameraFocusPosition(qr);

    this.addAnimation(new Animation(durationMs, (a) => {
      this.three.camera.position.copy(from.clone().lerp(to, a));
    }))
  }
}
