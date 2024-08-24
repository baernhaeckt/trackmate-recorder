export class PositionService {
  position = {
    latitude: 0,
    longitude: 0,
    altitude: 0
  };
  lastUpdated = new Date();

  private _lastPosition = {
    latitude: 0,
    longitude: 0,
    altitude: 0
  };

  private watchId: number | null = null;
  private observers: Array<(position: { latitude: number; longitude: number; altitude: number }, lastUpdated: Date) => Promise<void>> = [];

  constructor() {
  }

  // Allow external consumers to register for updates
  subscribe(callback: (position: { latitude: number; longitude: number; altitude: number }, lastUpdated: Date) => Promise<void>) {
    this.observers.push(callback);
  }

  // Notify all subscribers of the position change
  private async notifyObservers() {
    for (const observer of this.observers) {
      await observer(this.position, this.lastUpdated);
    }
  }

  watchPosition() {
    this.watchId = setInterval(() => {
      this.getCurrentPosition().then(async (position: any) => {
        this._lastPosition.latitude = position.coords.latitude ?? 0;
        this._lastPosition.longitude = position.coords.longitude ?? 0;
        this._lastPosition.altitude = position.coords.altitude ?? 0;

        if (this.position.latitude !== this._lastPosition.latitude ||
          this.position.longitude !== this._lastPosition.longitude ||
          this.position.altitude !== this._lastPosition.altitude) {
          this.position.latitude = this._lastPosition.latitude;
          this.position.longitude = this._lastPosition.longitude;
          this.position.altitude = this._lastPosition.altitude;

          this.lastUpdated = new Date();
          await this.notifyObservers(); // Notify observers whenever the position changes
        }
      });
    }, 250);
  }

  async clearWatch() {
    if (this.watchId !== null) {
      clearInterval(this.watchId);
    }
  }

  private async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    });
  }
}
