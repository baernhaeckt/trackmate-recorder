
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

  async trackNode(previousTrackNodeId: string, lat: number, lon: number, alt: number, image: UploadPictureModel) {
    if (!this._trackNodeHub || this._trackNodeHub.state !== signalR.HubConnectionState.Connected) {
      throw new Error("The WebSocket connection is not yet established.");
    }

    const createTrackNodeModel = {
      PreviousTrackNodeId: previousTrackNodeId,
      Location: {
        Latitude: lat,
        Longitude: lon,
        Altitude: alt
      },
      Vector: {
        X: 0,
        Y: 0,
        Z: 0
      },
      Orientation: {
        Alpha: 0,
        Beta: 0,
        Gamma: 0
      }
    };

    const trackNode = await this._trackNodeHub?.invoke<TrackNodeModel>("CreateTrackNode", createTrackNodeModel);
    image.TrackNodeId = trackNode?.Id;

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