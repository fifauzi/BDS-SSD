// src/utils/helpers.js

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDuration = (milliseconds) => {
  if (milliseconds < 0) milliseconds = 0;
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

// Ini adalah PACE RATA-RATA (AVERAGE PACE)
export const formatPace = (distanceMeters, durationMs) => {
  if (durationMs <= 0 || distanceMeters <= 10) {
      return '00:00';
  }
  const durationSeconds = durationMs / 1000;
  const distanceKm = distanceMeters / 1000;
  const paceSecondsPerKm = durationSeconds / distanceKm;
  if (!Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm > (99 * 60 + 59)) {
      return '99:59';
  }
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.round(paceSecondsPerKm % 60);
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
};

export const calculateCaloriesBurned = (durationMs, userWeightKg, distanceMeters) => {
  if (durationMs <= 0 || userWeightKg <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  if (distanceKm <= 0.01) return 0;
  const activityCalories = distanceKm * userWeightKg;
  return Math.round(activityCalories);
};

// FUNGSI BARU: MENGHITUNG PACE SAAT INI (CURRENT PACE)
export const calculateCurrentPace = (path) => {
  if (path.length < 2) {
    return '00:00';
  }
  const TIME_WINDOW_MS = 15000; // Jendela waktu 15 detik
  const lastPoint = path[path.length - 1];
  const now = lastPoint.timestamp;
  let startPointIndex = -1;
  for (let i = path.length - 2; i >= 0; i--) {
    if (now - path[i].timestamp <= TIME_WINDOW_MS) {
      startPointIndex = i;
    } else {
      break;
    }
  }
  if (startPointIndex === -1) {
    return '00:00'; 
  }
  const startPoint = path[startPointIndex];
  let segmentDistance = 0;
  for (let i = startPointIndex; i < path.length - 1; i++) {
    segmentDistance += calculateDistance(path[i].latitude, path[i].longitude, path[i+1].latitude, path[i+1].longitude);
  }
  const segmentDuration = lastPoint.timestamp - startPoint.timestamp;
  if (segmentDuration <= 0 || segmentDistance <= 1) {
      return '00:00';
  }
  const paceSecondsPerKm = (segmentDuration / 1000) / (segmentDistance / 1000);
  if (!Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm > (99 * 60 + 59)) {
    return '99:59';
  }
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.round(paceSecondsPerKm % 60);
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
};

export const calculateElevationGain = (path) => {
  let totalGain = 0;
  if (!path || path.length < 2) return 0;
  for (let i = 1; i < path.length; i++) {
    const current = path[i];
    const previous = path[i - 1];
    if (current.altitude && previous.altitude) {
        const elevationDiff = current.altitude - previous.altitude;
        if (elevationDiff > 0) {
            totalGain += elevationDiff;
        }
    }
  }
  return totalGain;
};

export const formatElevationGain = (meters) => {
    return `${(meters || 0).toFixed(2)} m`;
};

export const generateRealisticHeartRate = (lastHR = 150) => {
  const fluctuation = Math.random() * 10 - 5;
  const newHR = Math.min(Math.max(lastHR + fluctuation, 120), 180);
  return Math.round(newHR);
};

export const calculateAvgHeartRate = (heartRates) => {
  if (!heartRates || heartRates.length === 0) return 0; // FIX: Handle array kosong
  const sum = heartRates.reduce((acc, hr) => acc + hr, 0);
  return Math.round(sum / heartRates.length);
};
