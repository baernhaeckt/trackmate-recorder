<template>
  <main>
    <div>
      <h1>Geolocation and Sensor Tracking</h1>
      <p>Latitude: {{ latitude }}</p>
      <p>Longitude: {{ longitude }}</p>
      <p>Distance Travelled: {{ distance }} meters</p>
      <h2>Sensor Data</h2>
      <p>Acceleration X: {{ accelerationX }}</p>
      <p>Acceleration Y: {{ accelerationY }}</p>
      <p>Acceleration Z: {{ accelerationZ }}</p>
      <p>Rotation Rate Alpha: {{ rotationRateAlpha }}</p>
      <p>Rotation Rate Beta: {{ rotationRateBeta }}</p>
      <p>Rotation Rate Gamma: {{ rotationRateGamma }}</p>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from "vue";

export default defineComponent({
  setup() {
    const latitude = ref(0);
    const longitude = ref(0);
    const distance = ref(0);

    const accelerationX = ref(0);
    const accelerationY = ref(0);
    const accelerationZ = ref(0);
    const rotationRateAlpha = ref(0);
    const rotationRateBeta = ref(0);
    const rotationRateGamma = ref(0);

    let lastLatitude = ref(0);
    let lastLongitude = ref(0);

    const watchId = navigator.geolocation.watchPosition((position) => {
      latitude.value = position.coords.latitude;
      longitude.value = position.coords.longitude;

      if (lastLatitude.value && lastLongitude.value) {
        distance.value += calculateDistance(
          lastLatitude.value,
          lastLongitude.value,
          latitude.value,
          longitude.value
        );
      }

      lastLatitude.value = latitude.value;
      lastLongitude.value = longitude.value;
    });

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) *
        Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c; // in meters
      return distance;
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.acceleration) {
        accelerationX.value = event.acceleration.x || 0;
        accelerationY.value = event.acceleration.y || 0;
        accelerationZ.value = event.acceleration.z || 0;
      }

      if (event.rotationRate) {
        rotationRateAlpha.value = event.rotationRate.alpha || 0;
        rotationRateBeta.value = event.rotationRate.beta || 0;
        rotationRateGamma.value = event.rotationRate.gamma || 0;
      }
    };

    onMounted(() => {
      window.addEventListener("devicemotion", handleMotion);
    });

    onUnmounted(() => {
      window.removeEventListener("devicemotion", handleMotion);
      navigator.geolocation.clearWatch(watchId);
    });

    return {
      latitude,
      longitude,
      distance,
      accelerationX,
      accelerationY,
      accelerationZ,
      rotationRateAlpha,
      rotationRateBeta,
      rotationRateGamma,
    };
  },
});
</script>
