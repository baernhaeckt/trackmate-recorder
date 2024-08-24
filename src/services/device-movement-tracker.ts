
export class DeviceMovementTracker {
  private hasAccess: boolean = false;
  private initialOrientation: DOMPointReadOnly | null = null;
  position: DOMPoint = new DOMPoint(0, 0, 0);
  private velocity: DOMPoint = new DOMPoint(0, 0, 0);
  private lastTime: number | null = null;

  constructor() {
  }

  async requestAccess() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission().then(permissionState => {
        if (permissionState === 'granted') {
        } else {
          alert("Permission to access motion sensors denied.");
        }
      }).catch(console.error);
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission();
    }

    this.hasAccess = true;
  }

  startTracking(): void {
    if (!this.hasAccess) {
      console.warn("No access to sensors. Call requestAccess() first.");
      return;
    }
    window.addEventListener('devicemotion', this.handleMotion);
    window.addEventListener('deviceorientation', this.handleOrientation);
  }

  stopTracking(): void {
    window.removeEventListener('devicemotion', this.handleMotion);
    window.removeEventListener('deviceorientation', this.handleOrientation);
    this.velocity = new DOMPoint(0, 0, 0);
    this.position = new DOMPoint(0, 0, 0);
    this.lastTime = null;
  }

  private handleMotion = (event: DeviceMotionEvent): void => {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration || !this.lastTime || !this.initialOrientation) return;

    const currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000.0; // convert ms to seconds
    this.lastTime = currentTime;

    // Apply orientation transform to acceleration
    const transformedAcc = this.applyOrientationTransform(acceleration);

    // Update velocity and position using simple integration
    this.velocity.x += transformedAcc.x * dt;
    this.velocity.y += transformedAcc.y * dt;
    this.velocity.z += transformedAcc.z * dt;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
  };

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    if (!this.initialOrientation) {
      this.initialOrientation = new DOMPointReadOnly(event.alpha, event.beta, event.gamma);
    }
    // Update orientation (not implemented here)
  };

  private applyOrientationTransform(acceleration: DeviceAcceleration): DOMPoint {
    // Placeholder for actual orientation-based transformation
    return new DOMPoint(acceleration.x || 0, acceleration.y || 0, acceleration.z || 0);
  }
}
