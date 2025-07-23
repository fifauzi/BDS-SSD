// src/screens/MainAppScreen.js

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Platform, 
  Image, 
  TouchableWithoutFeedback, 
  Animated, 
  Easing, 
  ActivityIndicator, 
  Dimensions,
  StyleSheet // <--- TAMBAHKAN INI
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_OSM } from 'react-native-maps';
import * as Location from 'expo-location';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';

// Import dari file-file yang baru
import { auth, db } from '../config/firebase';
import { APP_ID } from '../config/appConfig';
import {
  calculateDistance,
  formatDuration,
  formatDistance,
  formatElevationGain,
  formatPace,
  generateRealisticHeartRate,
  calculateCaloriesBurned,
  calculateElevationGain,
  calculateAvgHeartRate
} from '../utils/helpers';
import { globalStyles } from '../styles/GlobalStyles';
import { darkMapStyle } from '../styles/MapStyles';

import MetricCard from '../components/MetricCard';
const windowHeight = Dimensions.get('window').height;

function MainAppScreen(props) {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [isTrackingMode, setIsTrackingMode] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [steps, setSteps] = useState(0); // Steps tidak digunakan dalam kode yang diberikan
  const [path, setPath] = useState([]);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseTime, setPauseTime] = useState(0);
  const [accumulatedPause, setAccumulatedPause] = useState(0);
  const [mapType, setMapType] = useState('standard'); // Tetap ada jika ingin pakai Google Maps
  const [history, setHistory] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [elevationGain, setElevationGain] = useState(0);
  const [heartRates, setHeartRates] = useState([]);
  const [avgHeartRate, setAvgHeartRate] = useState(0);
  const [currentHR, setCurrentHR] = useState(150);
  const [userWeight, setUserWeight] = useState(70); // Default user weight

  const [initialRegion, setInitialRegion] = useState({
    latitude: -6.2088, // Default ke Jakarta
    longitude: 106.8456,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Anonymous Firebase Auth
  useEffect(() => {
    if (!auth) {
      console.error('Firebase Auth is not initialized.');
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid);
        setTimeout(() => setIsLoading(false), 3200);
      } else {
        signInAnonymously(auth)
          .then((userCredential) => {
            setUserId(userCredential.user.uid);
            setTimeout(() => setIsLoading(false), 3200);
          })
          .catch((error) => {
            console.error('Anonymous sign-in error:', error);
            setIsLoading(false);
          });
      }
    });
    return () => unsubscribe();
  }, []);

  // Effects - Firestore Data
  useEffect(() => {
    if (!db || !userId) {
      return;
    }
    const activitiesCollectionRef = collection(db, `artifacts/${APP_ID}/users/${userId}/activities`);
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
  }, [db, userId]); // auth tidak perlu sebagai dependency jika sudah diinisialisasi di firebase.js

  // Effects - Tracking Duration
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

  // Effects - Heart Rate Simulation
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

  // Effects - Calculations
  useEffect(() => {
    setElevationGain(calculateElevationGain(path));
  }, [path]);

  useEffect(() => {
    setAvgHeartRate(calculateAvgHeartRate(heartRates));
  }, [heartRates]);

  // Effects - Initial Location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission Required', 'This app needs location permission to show your current location and track activity.');
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

  // Splash/loading state
  const [scaleAnim] = React.useState(new Animated.Value(1));
  React.useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1.1,
      duration: 1200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F54A38' }}>
        <Animated.Image
          source={require('../../assets/splash.png')} // Sesuaikan path
          style={{ width: 132, height: 132, marginBottom: 24, transform: [{ scale: scaleAnim }] }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (position) => {
        if (isPaused) return;

        const { latitude, longitude, altitude, horizontalAccuracy, accuracy } = position.coords;
        const currentAccuracy = horizontalAccuracy !== undefined ? horizontalAccuracy : accuracy; 

        if (currentAccuracy && currentAccuracy > 20) {
            console.log(`Skipping point due to poor accuracy: ${currentAccuracy.toFixed(2)}m`);
            return; 
        }

        const newPoint = { latitude, longitude, altitude: altitude || 0 };

        setPath((prevPath) => {
          let currentTotalDistance = distance;
          const updatedPath = [...prevPath];

          if (prevPath.length > 0) {
            const lastValidPoint = prevPath[prevPath.length - 1];
            const distMoved = calculateDistance(lastValidPoint.latitude, lastValidPoint.longitude, newPoint.latitude, newPoint.longitude);
            
            if (distMoved < 1 || distMoved > 100) { 
                console.log(`Skipping point due to unusual distance: ${distMoved.toFixed(2)}m`);
                return prevPath;
            }
            if (lastValidPoint.latitude === latitude && lastValidPoint.longitude === longitude) {
                return prevPath;
            }

            updatedPath.push(newPoint);
            currentTotalDistance += distMoved;

          } else {
            updatedPath.push(newPoint);
          }
          
          setDistance(currentTotalDistance);
          return updatedPath;
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
    setIsTrackingMode(false);
    setIsPaused(false);
    setPauseTime(0);
    setAccumulatedPause(0);

    const finalCalculatedCalories = calculateCaloriesBurned(duration, userWeight, avgHeartRate, distance);
    setCalories(finalCalculatedCalories);

    if (path.length > 0 && db && userId) {
      try {
        const activityData = {
          startTime: startTime,
          endTime: Date.now(),
          duration: duration,
          distance: distance,
          calories: finalCalculatedCalories,
          pace: formatPace(distance, duration),
          path: path,
          timestamp: Date.now(),
          heartRates: heartRates,
          avgHeartRate: calculateAvgHeartRate(heartRates),
          elevationGain: calculateElevationGain(path)
        };
        const activitiesCollectionRef = collection(db, `artifacts/${APP_ID}/users/${userId}/activities`);
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
    setIsTrackingMode(false);
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
    setElevationGain(0);
    setHeartRates([]);
    setAvgHeartRate(0);
    setCurrentHR(150);
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
      <ScrollView contentContainerStyle={globalStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={globalStyles.container}>
          {/* HEADER ala Inter Tight */}
          <View style={globalStyles.header}>
            <View style={globalStyles.headerIconWrapper}>
              <Image source={require('../../assets/logonih.png')} style={globalStyles.headerIcon} />
            </View>
            <Text style={[globalStyles.headerTitle, { color: '#fff' }]}>Activity Tracker</Text>
          </View>
          {/* USER ID */}
          {userId && (
            <Text style={[globalStyles.userIdText, { color: '#aaa' }]}>
              User ID: <Text style={globalStyles.userIdValue}>{userId}</Text>
            </Text>
          )}
          
          {/* TRACKING MODE LAYOUT */}
          {isTrackingMode ? (
            <>
              {/* MAP SECTION - PRIORITAS ATAS SAAT TRACKING */}
              <View style={globalStyles.mapSection}>
                <Text style={globalStyles.sectionTitle}>Live Tracking</Text>
                {/* MAP TYPE SWITCHER (Dihapus karena menggunakan PROVIDER_OSM) */}
                {/* <View style={globalStyles.mapTypeSwitcher}>
                  {['standard', 'satellite', 'hybrid', 'terrain'].map((type) => (
                    <TouchableWithoutFeedback key={type} onPress={() => setMapType(type)}>
                      <View style={[globalStyles.mapTypeButton, mapType === type && globalStyles.mapTypeButtonActive]}>
                        <Text style={[globalStyles.mapTypeButtonText, mapType === type && globalStyles.mapTypeButtonTextActive]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                    </TouchableWithoutFeedback>
                  ))}
                </View> */}
                <View style={[globalStyles.mapCard, globalStyles.mapCardTracking]}>
                  <MapView
                    ref={mapRef}
                    style={globalStyles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    followsUserLocation={isTracking}
                    provider={PROVIDER_OSM} // <<< MENGGUNAKAN OPENSTREETMAP
                    // customMapStyle={darkMapStyle} // TIDAK DIGUNAKAN UNTUK OSM
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
                    style={globalStyles.centerButton}
                    onPress={centerToLocation}
                  >
                    <View style={globalStyles.centerButtonInner}>
                      <Text style={globalStyles.centerButtonIcon}>📍</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {isTracking && path.length > 0 && (
                  <Text style={globalStyles.mapStatusText}>Live tracking active. Your path is being recorded.</Text>
                )}
              </View>
              
              {/* COMPACT METRICS - SAAT TRACKING */}
              <View style={globalStyles.metricsContainerCompact}>
                <MetricCard title="Distance" value={formatDistance(distance)} />
                <MetricCard title="Time" value={formatDuration(duration)} />
                <MetricCard title="Pace" value={formatPace(distance, duration)} />
                <MetricCard title="Elevation Gain" value={formatElevationGain(elevationGain)} />
                <MetricCard title="Calories" value={`${calories.toFixed(0)} Cal`} />
                <MetricCard 
                  title="Heart Rate" 
                  value={isTracking ? `${currentHR} bpm` : (avgHeartRate ? `${avgHeartRate} bpm` : '-')} 
                />
              </View>
              
              {/* CONTROL BUTTONS - SAAT TRACKING */}
              <View style={globalStyles.buttonContainer}>
                {!isPaused ? (
                  <TouchableOpacity style={globalStyles.pauseButton} onPress={pauseTracking}>
                    <Text style={globalStyles.buttonText}>Pause</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={globalStyles.resumeButton} onPress={resumeTracking}>
                    <Text style={globalStyles.buttonText}>Resume</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={globalStyles.stopButton} onPress={stopTracking}>
                  <Text style={globalStyles.buttonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* NORMAL LAYOUT - SAAT TIDAK TRACKING */}
              {/* METRIC CARDS ala Inter Tight */}
              <View style={globalStyles.metricsContainer}>
                <MetricCard title="Distance" value={formatDistance(distance)} />
                <MetricCard title="Avg Pace" value={formatPace(distance, duration)} />
                <MetricCard title="Moving Time" value={formatDuration(duration)} />
                <MetricCard title="Elevation Gain" value={formatElevationGain(elevationGain)} />
                <MetricCard title="Calories" value={`${calories.toFixed(0)} Cal`} />
                <MetricCard 
                  title="Avg Heart Rate" 
                  value={isTracking ? `${currentHR} bpm` : (avgHeartRate ? `${avgHeartRate} bpm` : '-')} 
                />
              </View>
              {/* BUTTONS ala Inter Tight */}
              <View style={globalStyles.buttonContainer}>
                {!isTracking ? (
                  <TouchableOpacity style={globalStyles.startButton} onPress={startTracking}>
                    <Text style={globalStyles.buttonText}>Start</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {!isPaused ? (
                      <TouchableOpacity style={globalStyles.pauseButton} onPress={pauseTracking}>
                        <Text style={globalStyles.buttonText}>Pause</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={globalStyles.resumeButton} onPress={resumeTracking}>
                        <Text style={globalStyles.buttonText}>Resume</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={globalStyles.stopButton} onPress={stopTracking}>
                      <Text style={globalStyles.buttonText}>Stop</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={globalStyles.resetButton} onPress={resetTracking}>
                      <Text style={globalStyles.buttonText}>Reset</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <View style={globalStyles.mapSection}>
                <Text style={globalStyles.sectionTitle}>Tracking Map</Text>
                {/* MAP TYPE SWITCHER (Dihapus karena menggunakan PROVIDER_OSM) */}
                {/* <View style={globalStyles.mapTypeSwitcher}>
                  {['standard', 'satellite', 'hybrid', 'terrain'].map((type) => (
                    <TouchableWithoutFeedback key={type} onPress={() => setMapType(type)}>
                      <View style={[globalStyles.mapTypeButton, mapType === type && globalStyles.mapTypeButtonActive]}>
                        <Text style={[globalStyles.mapTypeButtonText, mapType === type && globalStyles.mapTypeButtonTextActive]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                    </TouchableWithoutFeedback>
                  ))}
                </View> */}
                <View style={globalStyles.mapCard}>
                  <MapView
                    ref={mapRef}
                    style={globalStyles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    followsUserLocation={isTracking}
                    provider={PROVIDER_OSM} // <<< MENGGUNAKAN OPENSTREETMAP
                    // customMapStyle={darkMapStyle} // TIDAK DIGUNAKAN UNTUK OSM
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
                    style={globalStyles.centerButton}
                    onPress={centerToLocation}
                  >
                    <View style={globalStyles.centerButtonInner}>
                      <Text style={globalStyles.centerButtonIcon}>📍</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {isTracking && path.length > 0 && (
                  <Text style={globalStyles.mapStatusText}>Live tracking active. Your path is being recorded.</Text>
                )}
                {selectedActivity && selectedActivity.path.length > 0 && (
                  <Text style={globalStyles.mapStatusText}>
                    Showing activity history from {new Date(selectedActivity.startTime).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </>
          )}
          <View style={globalStyles.historySection}>
            <Text style={[globalStyles.sectionTitle, { color: '#fff' }]}>Activity History</Text>
            {history.length === 0 ? (
              <Text style={[globalStyles.noHistoryText, { color: '#aaa' }]}>No activity history yet.</Text>
            ) : (
              <ScrollView style={globalStyles.historyList}>
                {history.map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      globalStyles.historyItem,
                      selectedActivity?.id === activity.id && globalStyles.selectedHistoryItem,
                      { backgroundColor: '#23242A', borderRadius: 12, borderColor: '#333' },
                    ]}
                    onPress={() => props.navigation.navigate('ActivityHistoryDetail', { activity })}
                  >
                    <View style={globalStyles.historyItemContent}>
                      <Text style={[globalStyles.historyItemTitle, { color: '#fff' }]}>Activity on {new Date(activity.startTime).toLocaleDateString()}</Text>
                      <Text style={[globalStyles.historyItemDetail, { color: '#aaa' }]}>Duration: {formatDuration(activity.duration)} | Distance: {formatDistance(activity.distance)}</Text>
                      <Text style={[globalStyles.historyItemDetail, { color: '#aaa' }]}>Calories: {activity.calories ? activity.calories.toFixed(0) : 0} kkal</Text>
                      <Text style={[globalStyles.historyItemDetail, { color: '#aaa' }]}>Pace: {activity.pace}</Text>
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

export default MainAppScreen;