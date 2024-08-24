<template>
  <main class="main">
    <canvas id="video" class="video-container" width="640" height="480"></canvas>
    <div class="overlay">
      <div class="container">
        <h5>GPS Position</h5>
        <p>LatLong: {{ position.latitude.toFixed(6) }} / {{ position.longitude.toFixed(6) }}</p>
        <p>Altitude: {{ position.altitude.toFixed(2) }}</p>
        <p>Last update: {{ lastUpdate }}</p>
        <button v-if="!devicePositionEnabled" @click="enableDevicePosition">Enable Device Position</button>
        <div v-else>
          <h5>Device-Position:</h5>
          <p>x: {{ devicePosition.x.toFixed(2) }}</p>
          <p>y: {{ devicePosition.y.toFixed(2) }}</p>
          <p>z: {{ devicePosition.z.toFixed(2) }}</p>
          <h5>Orientation:</h5>
          <p>&alpha;: {{ devicePosition.orientation.alpha.toFixed(2) }} | &beta;: {{ devicePosition.orientation.beta.toFixed(2) }} | &gamma;: {{ devicePosition.orientation.gamma.toFixed(2) }}</p>
          <p>Last update: {{ lastUpdateDevicePosition }}</p>
        </div>
        <h5>Recorded track</h5>
        <p>Track-Uploads: {{ succeededUploads }} ok, {{ failedUploads }} failed, {{ ignoredUploads }} ignored</p>
        <p v-if="lastError">Error: {{ lastError }}</p>

        <div class="button-list">
          <button @click="toggleEnableUpload"><template v-if="uploadEnabled">Disable upload</template><template v-else>Enable upload</template></button>
          <button @click="triggerUpload">Trigger Upload</button>
          <button v-if="devicePositionEnabled" @click="resetDevicePosition">Reset Device Position</button>
        </div>
        <canvas id="transmitted" class="transmit-container" width="256" height="256"></canvas>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import type { DevicePositionModel } from "@/models/device-position-model";
import type { TrackNodeModel } from "@/models/track-node-model";
import { DevicePositionService } from "@/services/device-position-service";
import { ImageCaptureService } from "@/services/image-capture-service";
import { PositionService } from "@/services/position-service";
import { WebSocketService } from "@/services/websocket-service";
import { defineComponent, onMounted, onUnmounted, ref, type Ref } from "vue";

export default defineComponent({
  setup() {
    const webSocketService = new WebSocketService(import.meta.env.VITE_BACKEND_WEBSOCKET_URL);
    webSocketService.connect();
    let imageCaptureService: ImageCaptureService;
    const positionService = new PositionService();
    positionService.watchPosition();

    const devicePositionService = new DevicePositionService();

    const previousNode: Ref<TrackNodeModel | null> = ref(null);

    const position = ref({
      latitude: 0,
      longitude: 0,
      altitude: 0,
    });
    const devicePosition: Ref<DevicePositionModel> = ref({
      x: 0,
      y: 0,
      z: 0,
      orientation: {
        alpha: 0,
        beta: 0,
        gamma: 0,
      }
    });
    const lastUpdate = ref("");
    const lastUpdateDevicePosition = ref("");
    const succeededUploads = ref(0);
    const failedUploads = ref(0);
    const ignoredUploads = ref(0);
    const devicePositionEnabled = ref(false);
    const lastError = ref("");
    const isUploadInProgress = ref(false);
    const uploadEnabled = ref(false);

    const uploadData = async () => {
      if (isUploadInProgress.value) {
        return;
      }

      if (imageCaptureService) {
        try {
          isUploadInProgress.value = true;
          const image = imageCaptureService.extractImage();
          if (uploadEnabled.value) {
            previousNode.value = await webSocketService.trackNode(previousNode.value?.id ?? null, position.value, devicePosition.value, image);
          }

          const transmittedImage = document.getElementById("transmitted") as HTMLCanvasElement;
          const context = transmittedImage.getContext("2d")
          context!.putImageData(image.imageData!, 0, 0);
          delete image.imageData;

          if (uploadEnabled.value) {
            succeededUploads.value++;
          } else {
            ignoredUploads.value++;
          }
        } catch (error: any) {
          console.error(error);
          failedUploads.value++;
          lastError.value = error.message;
        } finally {
          isUploadInProgress.value = false;
        }
      }
    }

    positionService.subscribe(async (p, lastUpdated) => {
      position.value = p;
      lastUpdate.value = lastUpdated.toLocaleTimeString();

      uploadData();
    });

    devicePositionService.subscribe(async (p) => {
      devicePosition.value = p;
      lastUpdateDevicePosition.value = new Date().toLocaleTimeString();
    });

    const enableDevicePosition = async () => {
      await devicePositionService.requestPermissions();
      await devicePositionService.startTracking();
      devicePositionEnabled.value = true;
    }

    const resetDevicePosition = async () => {
      await devicePositionService.resetPosition();
    }

    const triggerUpload = async () => {
      uploadData();
    }

    const toggleEnableUpload = () => {
      uploadEnabled.value = !uploadEnabled.value;
    }

    onMounted(async () => {
      const video = document.getElementById("video") as HTMLCanvasElement;
      imageCaptureService = new ImageCaptureService(video);
      imageCaptureService.requestPermissions();
      imageCaptureService.startCapture();
    });

    onUnmounted(async () => {
      imageCaptureService.stopCapture();
      positionService.clearWatch();
      webSocketService.disconnect();
    });

    return {
      uploadEnabled,
      devicePositionEnabled,
      position,
      devicePosition,
      lastUpdate,
      lastUpdateDevicePosition,
      lastError,
      succeededUploads,
      failedUploads,
      ignoredUploads,
      enableDevicePosition,
      resetDevicePosition,
      triggerUpload,
      toggleEnableUpload
    };
  },
  methods: {
    formatFloat(value: number, decimals: number): string {
      return value.toFixed(decimals);
    },
  },
});
</script>

<style scoped>
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 1.5rem;
  z-index: 1;
}

.container {
  width: 50vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.container p {
  width: 100%;
  text-align: left;
}

.transmit-container {
  width: 256px;
  height: 256px;
  margin: 20px auto;
}

@media (max-width: 768px) {
  .container {
    width: 90vw;
  }
}

.video-container {
  position: absolute;
  width: 100%;
  height: 100%;

  z-index: 0;
}

.button-list {
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  margin-top: 20px;
}

.button-list button {
  padding: 10px;
  font-size: .7rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 0;
  cursor: pointer;
}

.button-list button:first-child {
  background-color: #28a745;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
}

.button-list button:last-child {
  background-color: #dc3545;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
}
</style>