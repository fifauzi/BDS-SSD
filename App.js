import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Image, TouchableWithoutFeedback, Dimensions, ActivityIndicator, Animated, Easing } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getApps, initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  onAuthStateChanged,
  signInAnonymously,
  getAuth
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ====== HARDCODED CONFIG (UPDATE THIS!) ======
const firebaseConfig = {
  apiKey: "AIzaSyADCurpcZEhKD32nCZt_S436F--c-W3rw0",
  authDomain: "tracker-app-7b31c.firebaseapp.com",
  projectId: "tracker-app-7b31c",
  storageBucket: "tracker-app-7b31c.firebasestorage.app",
  messagingSenderId: "449584922629",
  appId: "1:449584922629:web:636ed1308df9025c631c6c",
  measurementId: "G-661TFLSP2T"
};
const appId = 'tracker-app-demo';
// =============================================

// Helper Functions
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

const formatPace = (distanceMeters, durationMs) => {
  if (distanceMeters === 0 || durationMs === 0) return '00:00 /km';
  const durationMinutes = durationMs / 1000 / 60;
  const distanceKm = distanceMeters / 1000;
  if (distanceKm === 0) return '00:00 /km';
  const paceMinutesPerKm = durationMinutes / distanceKm;
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)} /km`;
};

const generateRealisticHeartRate = (lastHR = 150) => {
  const fluctuation = Math.random() * 10 - 5;
  const newHR = Math.min(Math.max(lastHR + fluctuation, 120), 180);
  return Math.round(newHR);
};

const windowHeight = Dimensions.get('window').height;

// Dark mode map style
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];

// Inisialisasi Firebase
let app;
let auth;
let db;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } catch (error) {
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

const calculateElevationGain = (path) => {
  let totalGain = 0;
  for (let i = 1; i < path.length; i++) {
    const current = path[i];
    const previous = path[i - 1];
    const elevationDiff = current.altitude - previous.altitude;
    if (elevationDiff > 0) {
      totalGain += elevationDiff;
    }
  }
  return totalGain;
};

const calculateAvgHeartRate = (heartRates) => {
  if (heartRates.length === 0) return 0;
  const sum = heartRates.reduce((acc, hr) => acc + hr, 0);
  return Math.round(sum / heartRates.length);
};

const ActivityHistoryDetailScreen = ({ route }) => {
  const { activity } = route.params;
  const activityDate = activity.startTime ? new Date(activity.startTime) : null;
  return (
    <View style={{ flex: 1, backgroundColor: '#181A1B' }}>
      <ScrollView contentContainerStyle={{ padding: 0, backgroundColor: '#181A1B', minHeight: '100%' }}>
        {/* Map Section */}
        <View style={{ width: '100%', height: 260, backgroundColor: '#23242A' }}>
          <MapView
            style={{ width: '100%', height: '100%' }}
            initialRegion={activity.path && activity.path.length > 0 ? {
              latitude: activity.path[0].latitude,
              longitude: activity.path[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            } : {
              latitude: -6.2088,
              longitude: 106.8456,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            customMapStyle={[]}
          >
            {activity.path && activity.path.length > 0 && (
              <>
                <Polyline coordinates={activity.path} strokeWidth={6} strokeColor="#F54A38" />
                <Marker coordinate={activity.path[0]} title="Start" />
                {activity.path.length > 1 && <Marker coordinate={activity.path[activity.path.length - 1]} title="End" />}
              </>
            )}
          </MapView>
        </View>
        {/* Activity Name & Date */}
        <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>Activity Detail</Text>
          {activityDate && (
            <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 2 }}>
              {activityDate.toLocaleDateString()} {activityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        {/* Metrics Section */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
          <View style={{ width: '45%', alignItems: 'center', marginVertical: 10, backgroundColor: '#23242A', borderRadius: 12, padding: 10, marginHorizontal: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 2 }}>Distance</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{formatDistance(activity.distance)}</Text>
          </View>
          <View style={{ width: '45%', alignItems: 'center', marginVertical: 10, backgroundColor: '#23242A', borderRadius: 12, padding: 10, marginHorizontal: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 2 }}>Avg Pace</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{activity.pace}</Text>
          </View>
          <View style={{ width: '45%', alignItems: 'center', marginVertical: 10, backgroundColor: '#23242A', borderRadius: 12, padding: 10, marginHorizontal: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 2 }}>Moving Time</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{formatDuration(activity.duration)}</Text>
          </View>
          <View style={{ width: '45%', alignItems: 'center', marginVertical: 10, backgroundColor: '#23242A', borderRadius: 12, padding: 10, marginHorizontal: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 2 }}>Elevation Gain</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{activity.elevationGain ? `${activity.elevationGain} m` : '0 m'}</Text>
          </View>
          <View style={{ width: '45%', alignItems: 'center', marginVertical: 10, backgroundColor: '#23242A', borderRadius: 12, padding: 10, marginHorizontal: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 2 }}>Calories</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{activity.calories ? `${activity.calories.toFixed(0)} Cal` : '0 Cal'}</Text>
          </View>
          <View style={{ width: '45%', alignItems: 'center', marginVertical: 10, backgroundColor: '#23242A', borderRadius: 12, padding: 10, marginHorizontal: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 2 }}>Avg Heart Rate</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{activity.avgHeartRate ? `${activity.avgHeartRate} bpm` : '-'}</Text>
          </View>
        </View>
        {/* View Analysis Button */}
        <TouchableOpacity style={{ backgroundColor: '#F54A38', borderRadius: 12, marginHorizontal: 24, marginBottom: 24, paddingVertical: 16, alignItems: 'center', shadowColor: '#F54A38', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>View Analysis</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const Stack = createStackNavigator();

function MainAppScreen(props) {
  // Pindahkan semua hooks ke paling atas
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [isTrackingMode, setIsTrackingMode] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [steps, setSteps] = useState(0);
  const [path, setPath] = useState([]);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseTime, setPauseTime] = useState(0);
  const [accumulatedPause, setAccumulatedPause] = useState(0);
  const [mapType, setMapType] = useState('standard');
  const [mapStyle, setMapStyle] = useState(Platform.OS === 'android' ? darkMapStyle : []);
  const [history, setHistory] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [elevationGain, setElevationGain] = useState(0);
  const [heartRates, setHeartRates] = useState([]);
  const [avgHeartRate, setAvgHeartRate] = useState(0);
  const [currentHR, setCurrentHR] = useState(150);

  // 6. Google Auth Request
  // Comment out Google Auth Request
  /*
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '115005259800-4kqj7l34tdhlt29bcqkfn41ma4isvrfr.apps.googleusercontent.com',
    webClientId: '115005259800-9uqcnllh0m2sm8qs48skl6fuk0klcr6n.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    useProxy: true
  });
  */

  // 7. Initial Region State
  const [initialRegion, setInitialRegion] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // 8. Effects - Authentication
  // Comment out auth effect
  /*
  useEffect(() => {
    if (!auth) return;
    
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        const credential = window.firebase?.auth?.GoogleAuthProvider
          ? window.firebase.auth.GoogleAuthProvider.credential(null, authentication.accessToken)
          : null;
        if (credential) {
          signInWithCredential(auth, credential)
            .then((userCredential) => {
              setUser(userCredential.user);
              setIsAuthReady(true);
            })
            .catch((error) => {
              Alert.alert('Login Error', error.message);
            });
        } else {
          setUser({ displayName: 'Google User', email: 'user@google.com' });
          setIsAuthReady(true);
        }
      }
    }
  }, [response, auth]);
  */

  // Anonymous Firebase Auth
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid);
        setTimeout(() => setIsLoading(false), 3500); // Splash screen 3 menit
      } else {
        // Sign in anonymously if not logged in
        signInAnonymously(auth)
          .then((userCredential) => {
            setUserId(userCredential.user.uid);
            setTimeout(() => setIsLoading(false), 3500); // Splash screen 3 menit
          })
          .catch((error) => {
            console.error('Anonymous sign-in error:', error);
            setIsLoading(false);
          });
      }
    });
    return () => unsubscribe();
  }, []);

  // 9. Effects - Firestore Data
  useEffect(() => {
    if (!db || !userId || !auth) { // Changed condition to !auth as per edit hint
      return;
    }
    const activitiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/activities`);
    const q = query(activitiesCollectionRef, orderBy('startTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(activitiesData);
    }, (error) => {
      console.error("Error fetching history:", error);
    });
    return () => unsubscribe();
  }, [db, userId, auth]); // Changed dependency to auth as per edit hint

  // 10. Effects - Tracking
  useEffect(() => {
    let interval;
    if (isTracking && !isPaused) {
      interval = setInterval(() => {
        setDuration(Date.now() - startTime - accumulatedPause);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTracking, isPaused, startTime, accumulatedPause]);

  useEffect(() => {
    let hrInterval;
    if (isTracking && !isPaused) {
      hrInterval = setInterval(() => {
        const newHR = generateRealisticHeartRate(currentHR);
        setCurrentHR(newHR);
        setHeartRates(prev => [...prev, newHR]);
      }, 2000);
    }
    return () => clearInterval(hrInterval);
  }, [isTracking, isPaused, currentHR]);

  // 11. Effects - Calculations
  useEffect(() => {
    setElevationGain(calculateElevationGain(path));
  }, [path]);

  useEffect(() => {
    setAvgHeartRate(calculateAvgHeartRate(heartRates));
  }, [heartRates]);

  // 12. Effects - Initial Location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setInitialRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    })();
  }, []);

  // Initialize WebBrowser for auth
  // WebBrowser.maybeCompleteAuthSession();

  // Logout function
  const handleLogout = async () => {
    // if (!auth) return; // Removed as per edit hint
    
    // try {
    //   await auth.signOut();
    //   setUser(null); // Removed as per edit hint
    //   setUserId(''); // Removed as per edit hint
    //   setIsAuthReady(false); // Removed as per edit hint
    // } catch (error) {
    //   Alert.alert('Logout Error', error.message);
    // }
  };

  // Splash/loading state
  const [scaleAnim] = React.useState(new Animated.Value(1));
  React.useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1.1, // 10% lebih besar
      duration: 1200, // 1.2 detik
      useNativeDriver: true,
      easing: Easing.out(Easing.ease), // Perbaikan di sini
    }).start();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F54A38' }}>
        <Animated.Image
          source={require('./assets/splash.png')}
          style={{ width: 132, height: 132, marginBottom: 24, transform: [{ scale: scaleAnim }] }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Login screen
  // if (!user) { // Removed as per edit hint
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181A20' }}>
  //       <Image source={require('./assets/logonih.png')} style={{ width: 120, height: 120, marginBottom: 32 }} />
  //       <Text style={{ color: '#FFEEA8', fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Sign in to TrackerApp</Text>
  //       <TouchableOpacity
  //         style={{ backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }}
  //         onPress={() => promptAsync()}
  //         disabled={!request}
  //       >
  //         <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png' }} style={{ width: 24, height: 24, marginRight: 12 }} />
  //         <Text style={{ color: '#23242A', fontWeight: 'bold', fontSize: 16 }}>Sign in with Google</Text>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // }

  // Meminta izin lokasi
  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  };

  // Mulai pelacakan
  const startTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Location Permission Required', 'This app needs location permission to track your activity.');
      return;
    }
    setIsTracking(true);
    setIsTrackingMode(true);
    setIsPaused(false);
    setStartTime(Date.now());
    setDuration(0);
    setDistance(0);
    setCalories(0);
    setSteps(0);
    setPath([]);
    setSelectedActivity(null);
    setAccumulatedPause(0);
    setPauseTime(0);
    setHeartRates([]);
    setCurrentHR(150);
    // Mulai tracking lokasi
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation, // Akurasi tertinggi
        timeInterval: 1000, // 1 detik
        distanceInterval: 1, // 1 meter
      },
      (position) => {
        if (isPaused) return;
        const { latitude, longitude } = position.coords;
        const newPoint = { latitude, longitude };
        setPath((prevPath) => {
          if (prevPath.length > 0) {
            const last = prevPath[prevPath.length - 1];
            const dist = calculateDistance(last.latitude, last.longitude, latitude, longitude);
            if (dist > 50) return prevPath; // Filter lonjakan > 50 meter
            if (last.latitude === latitude && last.longitude === longitude) return prevPath; // Hindari duplikat
          }
          return [...prevPath, newPoint];
        });
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: latitude,
            longitude: longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 1000);
        }
      }
    );
    setLocationSubscription(subscription);
  };

  // Fungsi Pause
  const pauseTracking = () => {
    setIsPaused(true);
    setPauseTime(Date.now());
  };

  // Fungsi Resume
  const resumeTracking = () => {
    setIsPaused(false);
    setAccumulatedPause((prev) => prev + (Date.now() - pauseTime));
    setPauseTime(0);
  };

  // Hentikan pelacakan
  const stopTracking = async () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsTracking(false);
    setIsTrackingMode(false); // Nonaktifkan tracking mode
    setIsPaused(false);
    setPauseTime(0);
    setAccumulatedPause(0);
    if (path.length > 0 && db && userId) {
      try {
        const activityData = {
          startTime: startTime,
          endTime: Date.now(),
          duration: duration,
          distance: distance,
          calories: calories,
          pace: formatPace(distance, duration),
          path: path,
          timestamp: Date.now(),
          heartRates: heartRates, // Simpan data heart rate
          avgHeartRate: calculateAvgHeartRate(heartRates) // Simpan average heart rate
        };
        const activitiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/activities`);
        await addDoc(activitiesCollectionRef, activityData);
        console.log("Activity saved to Firestore!");
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    }
  };

  // Reset pelacakan
  const resetTracking = () => {
    stopTracking();
    setIsTrackingMode(false); // Nonaktifkan tracking mode
    setStartTime(null);
    setDuration(0);
    setDistance(0);
    setCalories(0);
    setSteps(0);
    setPath([]);
    setSelectedActivity(null);
    setIsPaused(false);
    setPauseTime(0);
    setAccumulatedPause(0);
  };

  // Pilih aktivitas dari riwayat untuk ditampilkan di peta
  const selectActivity = (activity) => {
    setSelectedActivity(activity);
    setIsTracking(false);
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    if (mapRef.current && activity.path && activity.path.length > 0) {
      mapRef.current.fitToCoordinates(activity.path, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Fungsi untuk kembali ke lokasi pengguna
  const centerToLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to center the map.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }
    } catch (error) {
      console.error('Error centering to location:', error);
      Alert.alert('Error', 'Could not get current location.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#181A1B' }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* HEADER ala Inter Tight */}
          <View style={styles.header}>
            <View style={styles.headerIconWrapper}>
              <Image source={require('./assets/logonih.png')} style={styles.headerIcon} />
            </View>
            <Text style={[styles.headerTitle, { color: '#fff' }]}>Activity Tracker</Text>
            {/* Comment out logout button */}
            {/*<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>*/}
          </View>
          {/* USER ID */}
          {userId && (
            <Text style={[styles.userIdText, { color: '#aaa' }]}>
              User ID: <Text style={styles.userIdValue}>{userId}</Text>
            </Text>
          )}
          
          {/* TRACKING MODE LAYOUT */}
          {isTrackingMode ? (
            <>
              {/* MAP SECTION - PRIORITAS ATAS SAAT TRACKING */}
              <View style={styles.mapSection}>
                <Text style={styles.sectionTitle}>Live Tracking</Text>
                {/* MAP TYPE SWITCHER */}
                <View style={styles.mapTypeSwitcher}>
                  {['standard', 'satellite', 'hybrid', 'terrain'].map((type) => (
                    <TouchableWithoutFeedback key={type} onPress={() => setMapType(type)}>
                      <View style={[styles.mapTypeButton, mapType === type && styles.mapTypeButtonActive]}>
                        <Text style={[styles.mapTypeButtonText, mapType === type && styles.mapTypeButtonTextActive]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                    </TouchableWithoutFeedback>
                  ))}
                </View>
                <View style={[styles.mapCard, styles.mapCardTracking]}>
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    followsUserLocation={isTracking}
                    mapType={mapType}
                    customMapStyle={mapStyle}
                  >
                    {isTracking && path.length > 0 && (
                      <>
                        <Polyline coordinates={path} strokeWidth={5} strokeColor="#F54A38" />
                        <Marker coordinate={path[0]} title="Start" />
                        {path.length > 1 && <Marker coordinate={path[path.length - 1]} title="End" />}
                      </>
                    )}
                  </MapView>
                  
                  {/* Location Center Button */}
                  <TouchableOpacity 
                    style={styles.centerButton}
                    onPress={centerToLocation}
                  >
                    <View style={styles.centerButtonInner}>
                      <Text style={styles.centerButtonIcon}>📍</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {isTracking && path.length > 0 && (
                  <Text style={styles.mapStatusText}>Live tracking active. Your path is being recorded.</Text>
                )}
              </View>
              
              {/* COMPACT METRICS - SAAT TRACKING */}
              <View style={styles.metricsContainerCompact}>
                <MetricCard title="Distance" value={formatDistance(distance)} />
                <MetricCard title="Time" value={formatDuration(duration)} />
                <MetricCard title="Pace" value={formatPace(distance, duration)} />
                <MetricCard title="Elevation Gain" value={`${elevationGain} m`} />
                <MetricCard title="Calories" value={`${calories.toFixed(0)} Cal`} />
                <MetricCard 
                  title="Heart Rate" 
                  value={isTracking ? `${currentHR} bpm` : (avgHeartRate ? `${avgHeartRate} bpm` : '-')} 
                />
              </View>
              
              {/* CONTROL BUTTONS - SAAT TRACKING */}
              <View style={styles.buttonContainer}>
                {!isPaused ? (
                  <TouchableOpacity style={styles.pauseButton} onPress={pauseTracking}>
                    <Text style={styles.buttonText}>Pause</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.resumeButton} onPress={resumeTracking}>
                    <Text style={styles.buttonText}>Resume</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                  <Text style={styles.buttonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* NORMAL LAYOUT - SAAT TIDAK TRACKING */}
              {/* METRIC CARDS ala Inter Tight */}
              <View style={styles.metricsContainer}>
                <MetricCard title="Distance" value={formatDistance(distance)} />
                <MetricCard title="Avg Pace" value={formatPace(distance, duration)} />
                <MetricCard title="Moving Time" value={formatDuration(duration)} />
                <MetricCard title="Elevation Gain" value={`${elevationGain} m`} />
                <MetricCard title="Calories" value={`${calories.toFixed(0)} Cal`} />
                <MetricCard 
                  title="Avg Heart Rate" 
                  value={isTracking ? `${currentHR} bpm` : (avgHeartRate ? `${avgHeartRate} bpm` : '-')} 
                />
              </View>
              {/* BUTTONS ala Inter Tight */}
              <View style={styles.buttonContainer}>
                {!isTracking ? (
                  <TouchableOpacity style={styles.startButton} onPress={startTracking}>
                    <Text style={styles.buttonText}>Start</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {!isPaused ? (
                      <TouchableOpacity style={styles.pauseButton} onPress={pauseTracking}>
                        <Text style={styles.buttonText}>Pause</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.resumeButton} onPress={resumeTracking}>
                        <Text style={styles.buttonText}>Resume</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                      <Text style={styles.buttonText}>Stop</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetButton} onPress={resetTracking}>
                      <Text style={styles.buttonText}>Reset</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Tracking Map</Text>
            {/* MAP TYPE SWITCHER */}
            <View style={styles.mapTypeSwitcher}>
              {['standard', 'satellite', 'hybrid', 'terrain'].map((type) => (
                <TouchableWithoutFeedback key={type} onPress={() => setMapType(type)}>
                  <View style={[styles.mapTypeButton, mapType === type && styles.mapTypeButtonActive]}>
                    <Text style={[styles.mapTypeButtonText, mapType === type && styles.mapTypeButtonTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              ))}
            </View>
            <View style={styles.mapCard}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={true}
                followsUserLocation={isTracking}
                mapType={mapType}
                customMapStyle={mapStyle}
              >
                {isTracking && path.length > 0 && (
                  <>
                    <Polyline coordinates={path} strokeWidth={5} strokeColor="#F54A38" />
                    <Marker coordinate={path[0]} title="Start" />
                    {path.length > 1 && <Marker coordinate={path[path.length - 1]} title="End" />}
                  </>
                )}
                {selectedActivity && selectedActivity.path && selectedActivity.path.length > 0 && (
                  <>
                    <Polyline coordinates={selectedActivity.path} strokeWidth={5} strokeColor="#F54A38" />
                    <Marker coordinate={selectedActivity.path[0]} title="Start" />
                    {selectedActivity.path.length > 1 && <Marker coordinate={selectedActivity.path[selectedActivity.path.length - 1]} title="End" />}
                  </>
                )}
              </MapView>
              
              {/* Location Center Button */}
              <TouchableOpacity 
                style={styles.centerButton}
                onPress={centerToLocation}
              >
                <View style={styles.centerButtonInner}>
                  <Text style={styles.centerButtonIcon}>📍</Text>
                </View>
              </TouchableOpacity>
            </View>
            {isTracking && path.length > 0 && (
              <Text style={styles.mapStatusText}>You are currently tracking. Your path will appear here.</Text>
            )}
            {selectedActivity && selectedActivity.path.length > 0 && (
              <Text style={styles.mapStatusText}>
                Showing activity history from {new Date(selectedActivity.startTime).toLocaleDateString()}
              </Text>
            )}
          </View>
            </>
          )}
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: '#fff' }]}>Activity History</Text>
            {history.length === 0 ? (
              <Text style={[styles.noHistoryText, { color: '#aaa' }]}>No activity history yet.</Text>
            ) : (
              <ScrollView style={styles.historyList}>
                {history.map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.historyItem,
                      selectedActivity?.id === activity.id && styles.selectedHistoryItem,
                      { backgroundColor: '#23242A', borderRadius: 12, borderColor: '#333' },
                    ]}
                    onPress={() => props.navigation.navigate('ActivityHistoryDetail', { activity })}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={[styles.historyItemTitle, { color: '#fff' }]}>Activity on {new Date(activity.startTime).toLocaleDateString()}</Text>
                      <Text style={[styles.historyItemDetail, { color: '#aaa' }]}>Duration: {formatDuration(activity.duration)} | Distance: {formatDistance(activity.distance)}</Text>
                      <Text style={[styles.historyItemDetail, { color: '#aaa' }]}>Calories: {activity.calories ? activity.calories.toFixed(0) : 0} kkal</Text>
                      <Text style={[styles.historyItemDetail, { color: '#aaa' }]}>Pace: {activity.pace}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainApp" component={MainAppScreen} />
        <Stack.Screen name="ActivityHistoryDetail" component={ActivityHistoryDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const MetricCard = ({ title, value }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: windowHeight,
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 0,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 20,
    backgroundColor: 'rgba(255,234,168,0.10)',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  headerIconWrapper: {
    backgroundColor: 'rgba(35,36,42,0.3)', // transparan
    borderRadius: 40,
    padding: 18,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F54A38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFEEA8',
    letterSpacing: 1.2,
    fontFamily: 'System',
    textAlign: 'center',
    marginBottom: 0,
    marginTop: 2,
  },
  userIdText: {
    fontSize: 12,
    color: '#FFEEA8',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'System',
  },
  userIdValue: {
    fontFamily: 'System',
    backgroundColor: '#23242A',
    color: '#F54A38',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F54A38',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
    marginTop: 8,
    gap: 8,
  },
  metricsContainerCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 12,
    marginTop: 8,
    gap: 8,
  },
  metricCard: {
    backgroundColor: '#161316',
    borderRadius: 20,
    padding: 14,
    margin: 4,
    alignItems: 'center',
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    flexBasis: '46%',
    minWidth: 140,
    maxWidth: '48%',
    borderWidth: 1.5,
    borderColor: '#F54A38',
  },
  metricTitle: {
    fontSize: 13,
    color: '#FFEEA8',
    marginBottom: 4,
    fontWeight: '600',
    fontFamily: 'System',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'System',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 8,
  },
  startButton: {
    backgroundColor: '#F54A38',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
    marginHorizontal: 4,
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 90,
  },
  pauseButton: {
    backgroundColor: '#23242A',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
    marginHorizontal: 4,
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F54A38',
    minWidth: 90,
  },
  resumeButton: {
    backgroundColor: '#F54A38',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
    marginHorizontal: 4,
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 90,
  },
  stopButton: {
    backgroundColor: '#EC3434',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
    marginHorizontal: 4,
    shadowColor: '#EC3434',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 90,
  },
  resetButton: {
    backgroundColor: '#23242A',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
    marginHorizontal: 4,
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F54A38',
    minWidth: 90,
  },
  buttonText: {
    color: '#FFEEA8',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'System',
    textAlign: 'center',
  },
  mapSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFEEA8',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: 'System',
  },
  mapTypeSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  mapTypeButton: {
    backgroundColor: '#23242A',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#F54A38',
  },
  mapTypeButtonActive: {
    backgroundColor: '#F54A38',
    borderColor: '#F54A38',
  },
  mapTypeButtonText: {
    color: '#F54A38',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'System',
  },
  mapTypeButtonTextActive: {
    color: '#23242A',
  },
  mapCard: {
    backgroundColor: '#161316',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
    marginHorizontal: 8,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#F54A38',
    height: windowHeight * 0.28,
    minHeight: 180,
    maxHeight: 320,
  },
  mapCardTracking: {
    height: windowHeight * 0.45, // Lebih besar saat tracking
    minHeight: 300,
    maxHeight: 450,
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapStatusText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    color: '#FFEEA8',
    fontFamily: 'System',
  },
  historySection: {
    flex: 1,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  noHistoryText: {
    textAlign: 'center',
    color: '#FFEEA8',
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'System',
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 2,
  },
  historyItem: {
    backgroundColor: '#23242A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#F54A38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F54A38',
  },
  selectedHistoryItem: {
    borderColor: '#F54A38',
    borderWidth: 2,
    backgroundColor: '#23242A',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F54A38',
    marginBottom: 4,
    fontFamily: 'System',
  },
  historyItemDetail: {
    fontSize: 13,
    color: '#F54A38',
    fontFamily: 'System',
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#F54A38',
    borderRadius: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centerButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonIcon: {
    fontSize: 24,
  },
  logoutButton: {
    backgroundColor: '#23242A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F54A38',
    marginLeft: 10,
  },
  logoutButtonText: {
    color: '#F54A38',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
