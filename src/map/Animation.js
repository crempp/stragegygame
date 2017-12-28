class Animation {
  /**
   * Simple animation helper
   * @param durationMs duration of the animation in milliseconds
   * @param update animation function which will receive values between 0.0 and 1.0 over the duration of the animation
   * @param easingFunction function that determines the progression of the animation over time
   */
  constructor(durationMs, update,  easingFunction) {
    /**
     * Progress of the animation between 0.0 (start) and 1.0 (end).
     */
    this.progress = 0.0;
    this.durationMs = durationMs;
    this.update = update;
    this.easingFunction = easingFunction || this.easeInOutQuad;
  }

  /**
   * Advances the animation by the given amount of time in seconds.
   * Returns true if the animation is finished.
   */
  animate(dtS) {
    this.progress = this.progress + dtS * 1000 / this.durationMs;
    this.update(this.easingFunction(this.progress));
    return this.progress >= 1.0;
  }

  easeInOutQuad (t) {
    if ((t/=0.5) < 1) return 0.5*t*t;
    return -0.5 * ((--t)*(t-2) - 1);
  };

  easeLinear (t) {
    return t;
  }
}
