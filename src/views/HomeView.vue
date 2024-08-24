<template>
  <main class="main">
    <canvas id="video" class="video-container" width="640" height="480"></canvas>
    <div class="overlay">
      <p>LatLong: {{ position.latitude.toFixed(6) }} / {{ position.longitude.toFixed(6) }}</p>
      <p>Altitude: {{ position.altitude.toFixed(2) }}</p>
      <p>Last update: {{ lastUpdate }}</p>
    </div>
  </main>
</template>

<script lang="ts">
import { ImageCaptureService } from "@/services/image-capture-service";
import { PositionService } from "@/services/position-service";
import { WebSocketService } from "@/services/websocket-service";
import { defineComponent, onMounted, onUnmounted, ref } from "vue";

export default defineComponent({
  setup() {
    const webSocketService = new WebSocketService(import.meta.env.VITE_BACKEND_WEBSOCKET_URL);
    webSocketService.connect();
    let imageCaptureService: ImageCaptureService;
    const positionService = new PositionService();
    positionService.watchPosition();

    const position = ref({
      latitude: 0,
      longitude: 0,
      altitude: 0,
    });
    const lastUpdate = ref("");

    positionService.subscribe(async (p, lastUpdated) => {
      position.value = p;
      lastUpdate.value = lastUpdated.toLocaleTimeString();

      if (imageCaptureService) {
        const image = imageCaptureService.extractImage();
        await webSocketService.trackNode(position.value.latitude, position.value.longitude, position.value.altitude, image, true);
      }
    });

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
      position,
      lastUpdate,
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