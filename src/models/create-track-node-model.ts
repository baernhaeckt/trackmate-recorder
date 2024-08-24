import type { GeoLocation } from "./geo-location";
import type { Orientation } from "./orientation";
import type { TransformationVector } from "./transformation-vector";

export interface CreateTrackNodeModel {
  Location: GeoLocation,
  Vector: TransformationVector,
  Orientation: Orientation,
  previousTrackNodeId: string | null,
}