
export interface DevicePositionModel {
  x: number;
  y: number;
  z: number;
  orientation: DeviceOrientationModel;
}

export interface DeviceOrientationModel {
  alpha: number; // rotation around Z axis (0 to 360 degrees)
  beta: number;  // rotation around X axis (-180 to 180 degrees)
  gamma: number;  // rotation around Y axis (-90 to 90 degrees)
}