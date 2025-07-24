// src/utils/helpers.js

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

export const formatDuration = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num) => num.toString().padStart(2, '0');
  
  if (hours > 0) {
      return `${hours}h ${pad(minutes)}m`;
  } else if (minutes > 0) {
      return `${minutes}m ${pad(seconds)}s`;
  }
  return `${seconds}s`;
};

export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

export const formatElevationGain = (meters) => {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return `0.00 m`;
  }
  return `${meters.toFixed(2)} m`;
};

// ====================================================================
// FUNGSI PACE YANG DIREVISI (AKURAT & SESUAI STANDAR)
// ====================================================================
export const formatPace = (distanceMeters, durationMs) => {
  // Guard 1: Jika tidak ada durasi atau jarak, pace tidak dihitung.
  if (durationMs <= 0 || distanceMeters <= 0) {
      return '00:00'; // Cukup kembalikan 00:00
  }

  const durationSeconds = durationMs / 1000;
  const distanceKm = distanceMeters / 1000;

  // Guard 2 (Paling Penting): Jangan hitung pace jika jarak belum signifikan (misal < 10 meter).
  // Ini adalah praktik standar untuk mencegah nilai pace yang "liar" di awal akibat GPS yang belum stabil.
  if (distanceKm < 0.01) {
      return '00:00';
  }

  // Perhitungan Standar Pace: detik per kilometer
  const paceSecondsPerKm = durationSeconds / distanceKm;

  // Guard 3: Pastikan hasil perhitungan valid.
  if (!Number.isFinite(paceSecondsPerKm)) {
      return '00:00';
  }

  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.round(paceSecondsPerKm % 60);

  // Guard 4: Batasi nilai pace agar tidak menampilkan angka aneh (misal > 99 menit)
  if (minutes > 99) {
    return '99:59';
  }

  const pad = (num) => num.toString().padStart(2, '0');
  
  return `${pad(minutes)}:${pad(seconds)}`; // Tampilkan hasil tanpa "/km" agar lebih bersih
};
// ====================================================================

export const generateRealisticHeartRate = (lastHR = 150) => {
  const fluctuation = Math.random() * 10 - 5;
  const newHR = Math.min(Math.max(lastHR + fluctuation, 120), 180);
  return Math.round(newHR);
};

export const calculateCaloriesBurned = (durationMs, userWeightKg, avgHeartRate, distanceMeters) => {
  if (durationMs === 0 || userWeightKg === 0) return 0;

  const durationMinutes = durationMs / 1000 / 60;
  let METs = 0;

  const speedKmh = (distanceMeters / 1000) / (durationMinutes / 60);
  
  if (speedKmh < 4.0) {
      METs = 3.0;
  } else if (speedKmh >= 4.0 && speedKmh < 8.0) {
      METs = 8.0;
  } else if (speedKmh >= 8.0) {
      METs = 10.0;
  } else {
      METs = 3.5;
  }

  const calories = (METs * userWeightKg * (durationMinutes / 60));

  return Math.round(calories);
};

export const calculateElevationGain = (path) => {
  let totalGain = 0;
  for (let i = 1; i < path.length; i++) {
    const current = path[i];
    const previous = path[i - 1];
    const elevationDiff = (current.altitude || 0) - (previous.altitude || 0);
    if (elevationDiff > 0) {
      totalGain += elevationDiff;
    }
  }
  return totalGain;
};

export const calculateAvgHeartRate = (heartRates) => {
  if (heartRates.length === 0) return 0;
  const sum = heartRates.reduce((acc, hr) => acc + hr, 0);
  return Math.round(sum / heartRates.length);
};