/**
 * @classdesc
 * Animation does a foo bar asdfasd asdf asdf asdfaf dsasdf
 *
 * @memberOf module:map
 */
class Animation {
  /**
   * Simple animation helper
   *
   * @constructor
   * @param {number} durationMs duration of the animation in milliseconds
   * @param {function} update animation function which will receive values between 0.0 and 1.0 over the duration of the animation
   * @param {function} easingFunction function that determines the progression of the animation over time
   */
  constructor(durationMs, update,  easingFunction) {
    /**  Progress of the animation between 0.0 (start) and 1.0 (end). */
    this.progress = 0.0;

    /** Animation duration */
    this.durationMs = durationMs;

    /** Animation update function */
    this.update = update;

    /** Animation easing function */
    this.easingFunction = easingFunction || this.easeInOutQuad;
  }

  /**
   * Advances the animation by the given amount of time in seconds.
   * Returns true if the animation is finished.
   *
   * @param {number} dtS Time change in seconds
   * @return {boolean}
   */
  animate(dtS) {
    this.progress = this.progress + dtS * 1000 / this.durationMs;
    this.update(this.easingFunction(this.progress));
    return this.progress >= 1.0;
  }

  /**
   * Quadratic in/out easing function. Default easing function.
   *
   * @param {number} t
   * @return {number}
   */
  easeInOutQuad (t) {
    if ((t/=0.5) < 1) return 0.5*t*t;
    return -0.5 * ((--t)*(t-2) - 1);
  };

  /**
   * Linear easing function
   *
   * @param {number} t
   * @return {number}
   */
  easeLinear (t) {
    return t;
  }
}

export default Animation;
