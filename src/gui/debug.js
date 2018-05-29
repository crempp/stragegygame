import dat from "dat.gui";

export default class DebugGUI {

  constructor (three) {
    this.camera = three.camera;
    this.renderer = three.renderer;
    this.scene = three.scene;

    this.gui = new dat.GUI();

    const cameraFolder = this.gui.addFolder('Camera');
    cameraFolder.add(this.camera, "fov", 0, 100).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraFolder.add(this.camera, "near", 0, 100).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraFolder.add(this.camera, "far", 0, 1000).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraFolder.add(this.camera, "zoom", 1, 10).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    const cameraPositionFolder = cameraFolder.addFolder('Position');
    cameraPositionFolder.add(this.camera.position, "x", -350, 350).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraPositionFolder.add(this.camera.position, "y", -350, 350).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraPositionFolder.add(this.camera.position, "z", -350, 350).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    const cameraRotationFolder = cameraFolder.addFolder('Rotation');
    cameraRotationFolder.add(this.camera.rotation, "x", -1, 1).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraRotationFolder.add(this.camera.rotation, "y", -1, 1).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraRotationFolder.add(this.camera.rotation, "z", -1, 1).listen().onChange(() => {
      this.camera.updateProjectionMatrix();
    });
    cameraFolder.open();
  }
}
