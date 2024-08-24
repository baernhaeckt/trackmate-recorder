import type { GeoLocation } from "./geo-location";
import type { Orientation } from "./orientation";
import type { TransformationVector } from "./transformation-vector";

export interface TrackNodeModel {
  Id: string,
  PreviousTrackNodeId: string,
  Location: GeoLocation,
  Vector: TransformationVector,
  Orientation: Orientation
}