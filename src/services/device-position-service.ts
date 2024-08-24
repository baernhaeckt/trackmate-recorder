import type { DevicePositionModel } from "@/models/device-position-model";
import KalmanFilter from 'kalmanjs'; // Importing Kalman filter

export class DevicePositionService {
  private _currentSpeed = { x: 0, y: 0, z: 0 };

  private _positionChange: DevicePositionModel = {
    x: 0,
    y: 0,
    z: 0,
    orientation: {
      alpha: 0,
      beta: 0,
      gamma: 0,
    },
  };

  // Kalman filters for each axis
  private _kalmanX = new KalmanFilter();
  private _kalmanY = new KalmanFilter();
  private _kalmanZ = new KalmanFilter();

  private observers: Array<(devicePosition: DevicePositionModel) => Promise<void>> = [];

  constructor() {
    // Bind methods to the instance
    this.handleOrientation = this.handleOrientation.bind(this);
    this.handleMotion = this.handleMotion.bind(this);
  }

  // Allow external consumers to register for updates
  subscribe(callback: (devicePosition: DevicePositionModel) => Promise<void>) {
    this.observers.push(callback);
  }

  async requestPermissions() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState !== 'granted') {
          alert("Permission to access device motion was denied.");
        }
      } catch (e) {
        console.error("Error requesting device motion permission", e);
      }
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState !== 'granted') {
          alert("Permission to access device orientation was denied.");
        }
      } catch (e) {
        console.error("Error requesting device orientation permission", e);
      }
    }
  }

  startTracking() {
    window.addEventListener('deviceorientation', this.handleOrientation);
    window.addEventListener('devicemotion', this.handleMotion);
  }

  stopTracking() {
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.removeEventListener('devicemotion', this.handleMotion);
  }

  handleMotion(event: DeviceMotionEvent) {
    const deltaTime = event.interval / 1000; // Convert ms to seconds
    const minimumAcceleration = 0.1; // Minimum acceleration to consider for integration

    if (event.acceleration && event.acceleration.x !== null && event.acceleration.y !== null && event.acceleration.z !== null) {
      let effectiveX = event.acceleration.x;
      let effectiveY = event.acceleration.y;
      let effectiveZ = event.acceleration.z;

      if (effectiveX < minimumAcceleration && effectiveX > -minimumAcceleration) {
        effectiveX = 0;
      }

      if (effectiveY < minimumAcceleration && effectiveY > -minimumAcceleration) {
        effectiveY = 0;
      }

      if (effectiveZ < minimumAcceleration && effectiveZ > -minimumAcceleration) {
        effectiveZ = 0;
      }

      // Apply Kalman filter to smooth acceleration data
      const filteredAx = this._kalmanX.filter(effectiveX);
      const filteredAy = this._kalmanY.filter(effectiveY);
      const filteredAz = this._kalmanZ.filter(effectiveZ);

      // Transform filtered acceleration data based on device orientation
      /*
      const adjustedAcceleration = this.transformAcceleration(
        filteredAx,
        filteredAy,
        filteredAz,
        this._positionChange.orientation.alpha,
        this._positionChange.orientation.beta,
        this._positionChange.orientation.gamma
      );
      */

      const adjustedAcceleration = {
        x: filteredAx,
        y: filteredAy,
        z: filteredAz
      };


      // Integrate filtered acceleration to get velocity
      this._currentSpeed.x += adjustedAcceleration.x * deltaTime;
      this._currentSpeed.y += adjustedAcceleration.y * deltaTime;
      this._currentSpeed.z += adjustedAcceleration.z * deltaTime;

      // Convert speed to position change
      const earthRadius = 6371000; // Radius of Earth in meters

      this._positionChange.x = (this._currentSpeed.x * deltaTime) * (180 / Math.PI) * earthRadius;
      this._positionChange.y = (this._currentSpeed.y * deltaTime) * (180 / Math.PI) * earthRadius;
      this._positionChange.z = (this._currentSpeed.z * deltaTime) * (180 / Math.PI) * earthRadius;
    }
  }

  handleOrientation(event: DeviceOrientationEvent) {
    const alpha = event.alpha || 0;
    const beta = event.beta || 0;
    const gamma = event.gamma || 0;

    // Apply gyroscope calibration
    this._positionChange.orientation.alpha = alpha;
    this._positionChange.orientation.beta = beta;
    this._positionChange.orientation.gamma = gamma;

    // Notify observers of the updated position change
    this.notifyObservers();
  }

  resetPosition() {
    this._currentSpeed = { x: 0, y: 0, z: 0 };
    this._positionChange = {
      x: 0,
      y: 0,
      z: 0,
      orientation: {
        alpha: 0,
        beta: 0,
        gamma: 0,
      },
    };

    this.notifyObservers();
  }

  private async notifyObservers() {
    for (const observer of this.observers) {
      await observer(this._positionChange);
    }
  }

  private transformAcceleration(ax: number, ay: number, az: number, alpha: number, beta: number, gamma: number) {
    // Convert angles from degrees to radians
    const alphaRad = alpha * (Math.PI / 180);
    const betaRad = beta * (Math.PI / 180);
    const gammaRad = gamma * (Math.PI / 180);

    // Calculate rotation matrix components
    const sinAlpha = Math.sin(alphaRad);
    const cosAlpha = Math.cos(alphaRad);
    const sinBeta = Math.sin(betaRad);
    const cosBeta = Math.cos(betaRad);
    const sinGamma = Math.sin(gammaRad);
    const cosGamma = Math.cos(gammaRad);

    // Adjust acceleration to align with global coordinates
    const adjustedAx = ax * (cosBeta * cosGamma) + ay * (cosAlpha * sinGamma + sinAlpha * sinBeta * cosGamma) + az * (sinAlpha * sinGamma - cosAlpha * sinBeta * cosGamma);
    const adjustedAy = ax * (-cosBeta * sinGamma) + ay * (cosAlpha * cosGamma - sinAlpha * sinBeta * sinGamma) + az * (sinAlpha * cosGamma + cosAlpha * sinBeta * sinGamma);
    const adjustedAz = ax * (sinBeta) + ay * (-sinAlpha * cosBeta) + az * (cosAlpha * cosBeta);

    return { x: adjustedAx, y: adjustedAy, z: adjustedAz };
  }
}
