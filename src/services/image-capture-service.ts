import type { UploadPictureModel } from "@/models/upload-picture-model";


export class ImageCaptureService {
  private _canvasElement: HTMLCanvasElement;
  private _videoElement: HTMLVideoElement;
  private _context: CanvasRenderingContext2D | undefined;

  private DESIRED_VIDEO_DEVICE = 'Rückseitige Triple-Kamera';

  constructor(canvasElement: HTMLCanvasElement) {
    this._canvasElement = canvasElement;
    this._videoElement = document.createElement('video');
    this._videoElement.autoplay = true;
    this._videoElement.muted = true;  // Necessary for autoplay on some browsers
    this._videoElement.playsInline = true; // For iOS devices
  }

  async requestPermissions() {
    if (typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        let stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const desiredDevice = videoDevices.find(device => device.label.includes(this.DESIRED_VIDEO_DEVICE));
        if (desiredDevice) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: desiredDevice.deviceId } });
        }

        this._videoElement.srcObject = stream;
        this._videoElement.play();
      } catch (e) {
        console.error("Error requesting video capture permission", e);
      }
    }
  }

  async startCapture() {
    if (this._videoElement) {
      this._videoElement.onloadedmetadata = () => {
        this._context = this._canvasElement.getContext('2d')!;
        this._videoElement.play();
        this.captureFrame();
      };
    }
    this._context = this._canvasElement.getContext('2d')!;
    this._context.drawImage(this._videoElement, 0, 0, this._canvasElement.width, this._canvasElement.height);
  }

  captureFrame() {
    if (this._context && this._videoElement) {
      this._context.drawImage(this._videoElement, 0, 0, this._canvasElement.width, this._canvasElement.height);
      requestAnimationFrame(this.captureFrame.bind(this)); // Keep updating the canvas as the video plays
    }
  }

  stopCapture() {
    this._context = undefined;
  }

  extractImage(): UploadPictureModel {
    // Create an offscreen canvas where the original image will be drawn
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = this._canvasElement.width;
    originalCanvas.height = this._canvasElement.height;
    const originalContext = originalCanvas.getContext('2d');

    // Draw the existing canvas's content on the offscreen canvas
    originalContext!.drawImage(this._canvasElement, 0, 0);

    // Create another canvas to perform the resize operation
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = 256;  // target width
    resizedCanvas.height = 256; // target height
    const resizedContext = resizedCanvas.getContext('2d');

    // Draw the image on the resized canvas, scaling it
    resizedContext!.drawImage(originalCanvas, 0, 0, 256, 256);

    // Get the image data from the resized canvas as compressed jpeg
    const dataUrl = resizedCanvas.toDataURL('image/jpeg', 0.7);

    return {
      trackNodeId: undefined,
      imageDataBase64: dataUrl.replace('data:image/jpeg;base64,', ''),
      imageData: resizedContext!.getImageData(0, 0, 256, 256),
      mimeType: 'image/jpeg'
    };
  }
}