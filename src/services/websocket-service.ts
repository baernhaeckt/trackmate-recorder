
import type { CreateTrackNodeModel } from "@/models/create-track-node-model";
import type { DevicePositionModel } from "@/models/device-position-model";
import type { TrackNodeModel } from "@/models/track-node-model";
import type { UploadPictureModel } from "@/models/upload-picture-model";
import * as signalR from "@microsoft/signalr";

export class WebSocketService {
  private _trackNodeHubUrl: string;
  private _trackNodeHub: signalR.HubConnection | undefined;

  constructor(trackNodeHubUrl: string) {
    this._trackNodeHubUrl = trackNodeHubUrl;
  }

  async connect() {
    this._trackNodeHub = new signalR.HubConnectionBuilder()
      .withUrl(this._trackNodeHubUrl)
      .build();

    await this._trackNodeHub.start();
  }

  async disconnect() {
    await this._trackNodeHub?.stop();
  }

  async trackNode(previousTrackNodeId: string | null, geoPosition: { latitude: number; longitude: number; altitude: number }, devicePosition: DevicePositionModel, image: UploadPictureModel) {
    if (!this._trackNodeHub || this._trackNodeHub.state !== signalR.HubConnectionState.Connected) {
      throw new Error("The WebSocket connection is not yet established.");
    }

    const createTrackNodeModel: CreateTrackNodeModel = {
      previousTrackNodeId: previousTrackNodeId,
      Location: {
        latitude: geoPosition.latitude,
        longitude: geoPosition.longitude,
        altitude: geoPosition.altitude
      },
      Vector: {
        x: 0,
        y: 0,
        z: 0
      },
      Orientation: {
        alpha: devicePosition?.orientation.alpha ?? 0,
        beta: devicePosition?.orientation.beta ?? 0,
        gamma: devicePosition?.orientation.gamma ?? 0
      }
    };

    const trackNode = await this._trackNodeHub?.invoke<TrackNodeModel>("CreateTrackNode", createTrackNodeModel);
    image.trackNodeId = trackNode.id;

    await this._trackNodeHub?.invoke("UploadPictureChunkForTrackNode", image);

    return trackNode;
  }

  private imageDataToByteArray(imageData: ImageData): Uint8Array {
    // Extract the RGBA pixel data from the ImageData object
    const { data } = imageData;

    // Convert the ImageData.data (Uint8ClampedArray) to a Uint8Array
    const byteArray = new Uint8Array(data.buffer);

    return byteArray;
  }
}