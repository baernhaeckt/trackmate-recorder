import type { GeoLocation } from "./geo-location";
import type { TransformationVector } from "./transformation-vector";

export interface TrackNodeModel {
  Id: string,
  Location: GeoLocation,
  Vector: TransformationVector
}