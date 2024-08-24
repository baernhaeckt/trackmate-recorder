
import KalmanFilter from 'kalmanjs'; // Importing Kalman filter

export class DevicePositionService {

  private _currentSpeed = { x: 0, y: 0, z: 0 };
  private _gyroBias = { alpha: 0, beta: 0, gamma: 0 };
  private _gyroSampleCount = 0;
  private _accelerometerBias = { x: 0, y: 0, z: 0 };
  private _accelerometerSampleCount = 0;

  // Kalman filters for each axis
  private _kalmanX = new KalmanFilter();
  private _kalmanY = new KalmanFilter();
  private _kalmanZ = new KalmanFilter();

  // Variables to store orientation angles
  private _orientation = {
    alpha: 0, // rotation around Z axis (0 to 360 degrees)
    beta: 0,  // rotation around X axis (-180 to 180 degrees)
    gamma: 0  // rotation around Y axis (-90 to 90 degrees)
  };


  async requestPermissions() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState === 'granted') {
        } else {
          alert("Permission to access device motion was denied.");
        }
      } catch (e) {
        console.error("Error requesting device motion permission", e);
      }
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
        } else {
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

  startGyroCalibration() {
    this._gyroBias = { alpha: 0, beta: 0, gamma: 0 };
    this._gyroSampleCount = 0;
    window.addEventListener('deviceorientation', this.calibrateGyroscope);
  };

  startAccelerometerCalibration() {
    this._accelerometerBias = { x: 0, y: 0, z: 0 };
    this._accelerometerSampleCount = 0;
    window.addEventListener('devicemotion', this.calibrateAccelerometer);
  };

  handleMotion(event: DeviceMotionEvent) {
    const deltaTime = event.interval / 1000; // Convert ms to seconds

    if (event.acceleration && event.acceleration.x !== null && event.acceleration.y !== null && event.acceleration.z !== null) {

      const effectiveX = event.acceleration.x - this._accelerometerBias.x;
      const effectiveY = event.acceleration.y - this._accelerometerBias.y;
      const effectiveZ = event.acceleration.z - this._accelerometerBias.z;

      // Apply Kalman filter to smooth acceleration data
      const filteredAx = this._kalmanX.filter(effectiveX);
      const filteredAy = this._kalmanY.filter(effectiveY);
      const filteredAz = this._kalmanZ.filter(effectiveZ);

      // Transform filtered acceleration data based on device orientation
      const adjustedAcceleration = this.transformAcceleration(
        filteredAx,
        filteredAy,
        filteredAz,
        this._orientation.alpha,
        this._orientation.beta,
        this._orientation.gamma
      );

      // Integrate filtered acceleration to get velocity
      this._currentSpeed.x += adjustedAcceleration.x * deltaTime;
      this._currentSpeed.y += adjustedAcceleration.y * deltaTime;
      this._currentSpeed.z += adjustedAcceleration.z * deltaTime;

      // Convert speed to position change
      const earthRadius = 6371000; // Radius of Earth in meters
      _latitude.value += (_currentSpeed.x * deltaTime / earthRadius) * (180 / Math.PI);
      _longitude.value += (_currentSpeed.y * deltaTime / (earthRadius * Math.cos(_latitude.value * Math.PI / 180))) * (180 / Math.PI);
      _altitude.value += _currentSpeed.z * deltaTime;
    }
  };

  handleOrientation(event: DeviceOrientationEvent) {
    this._orientation.alpha = event.alpha || 0;
    this._orientation.beta = event.beta || 0;
    this._orientation.gamma = event.gamma || 0;

    // Apply gyroscope calibration
    this._orientation.alpha -= this._gyroBias.alpha;
    this._orientation.beta -= this._gyroBias.beta;
    this._orientation.gamma -= this._gyroBias.gamma;
  };


  private calibrateGyroscope(event: DeviceOrientationEvent) {
    this._gyroBias.alpha += event.alpha || 0;
    this._gyroBias.beta += event.beta || 0;
    this._gyroBias.gamma += event.gamma || 0;
    this._gyroSampleCount++;

    if (this._gyroSampleCount >= 100) { // Adjust sample count as needed
      this._gyroBias.alpha /= this._gyroSampleCount;
      this._gyroBias.beta /= this._gyroSampleCount;
      this._gyroBias.gamma /= this._gyroSampleCount;
      window.removeEventListener('deviceorientation', this.calibrateGyroscope);
      console.log("Gyroscope calibration complete:", this._gyroBias);
    }
  }

  private calibrateAccelerometer(event: DeviceMotionEvent) {
    this._accelerometerBias.x += event.accelerationIncludingGravity?.x || 0;
    this._accelerometerBias.y += event.accelerationIncludingGravity?.y || 0;
    this._accelerometerBias.z += event.accelerationIncludingGravity?.z || 0;
    this._accelerometerSampleCount++;

    if (this._accelerometerSampleCount >= 100) { // Adjust sample count as needed
      this._accelerometerBias.x /= this._accelerometerSampleCount;
      this._accelerometerBias.y /= this._accelerometerSampleCount;
      this._accelerometerBias.z /= this._accelerometerSampleCount;
      window.removeEventListener('devicemotion', this.calibrateAccelerometer);
      console.log("Accelerometer calibration complete:", this._accelerometerBias);
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
  };

}