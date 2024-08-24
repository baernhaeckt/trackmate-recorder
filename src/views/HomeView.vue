<template>
  <main class="main">
    <canvas id="video" class="video-container" width="640" height="480"></canvas>
    <div class="overlay">
      <p>LatLong: {{ position.latitude.toFixed(6) }} / {{ position.longitude.toFixed(6) }}</p>
      <p>Altitude: {{ position.altitude.toFixed(2) }}</p>
      <p>Last update: {{ lastUpdate }}</p>
      <p v-if="lastError">Error: {{ lastError }}</p>
      <button v-if="!devicePositionEnabled" @click="enableDevicePosition">Enable Device Position</button>
      <div v-else>
        <p>Device-Position:</p>
        <p>x: {{ devicePosition.x.toFixed(2) }}</p>
        <p>y: {{ devicePosition.y.toFixed(2) }}</p>
        <p>z: {{ devicePosition.z.toFixed(2) }}</p>
        <p>Orientation:</p>
        <p>alpha: {{ devicePosition.orientation.alpha.toFixed(2) }}</p>
        <p>beta: {{ devicePosition.orientation.beta.toFixed(2) }}</p>
        <p>gamma: {{ devicePosition.orientation.gamma.toFixed(2) }}</p>
        <p>Last update: {{ lastUpdateDevicePosition }}</p>
        <button @click="resetDevicePosition">Reset Device Position</button>
      </div>
      <button @click="startNewDevicePosition">Start new Device Position</button>
      <p>NewPosition: {{ newPosition }}</p>
      <p>Track-Uploads: {{ succeededUploads }} ok, {{ failedUploads }} failed</p>
      <button @click="triggerUpload">Trigger Upload</button>
      <canvas id="transmitted" class="transmit-container" width="256" height="256"></canvas>
    </div>
  </main>
</template>

<script lang="ts">
import type { DevicePositionModel } from "@/models/device-position-model";
import type { TrackNodeModel } from "@/models/track-node-model";
import { DeviceMovementTracker } from "@/services/device-movement-tracker";
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
    const devicePositionEnabled = ref(false);
    const newPosition = ref("");
    const lastError = ref("");
    const isUploadInProgress = ref(false);

    const uploadData = async () => {
      if (isUploadInProgress.value) {
        return;
      }

      if (imageCaptureService) {
        try {
          isUploadInProgress.value = true;
          const image = imageCaptureService.extractImage();
          const transmittedImage = document.getElementById("transmitted") as HTMLCanvasElement;
          const context = transmittedImage.getContext("2d")
          context!.putImageData(image.imageData!, 0, 0);
          delete image.imageData;

          previousNode.value = await webSocketService.trackNode(previousNode.value?.id ?? null, position.value.latitude, position.value.longitude, position.value.altitude, image);
          succeededUploads.value++;
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

    const startNewDevicePosition = async () => {
      try {
        const deviceMovementService = new DeviceMovementTracker();
        await deviceMovementService.requestAccess();
        deviceMovementService.startTracking();

        setInterval(() => {
          const pos = deviceMovementService.position;
          newPosition.value = `x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}`;
        })
      } catch (error) {
        alert(error);
      }
    }

    const triggerUpload = async () => {
      uploadData();
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
      devicePositionEnabled,
      position,
      devicePosition,
      lastUpdate,
      lastUpdateDevicePosition,
      lastError,
      succeededUploads,
      failedUploads,
      newPosition,
      startNewDevicePosition,
      enableDevicePosition,
      resetDevicePosition,
      triggerUpload
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

.video-container {
  position: absolute;
  width: 100%;
  height: 100%;

  z-index: 0;
}
</style>