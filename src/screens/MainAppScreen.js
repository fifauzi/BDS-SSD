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
    StyleSheet,
    SafeAreaView
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_OSM } from 'react-native-maps';
import * as Location from 'expo-location';
// =================================================================
// PERBAIKAN 1: Impor 'onAuthStateChanged' untuk mendapatkan user
// =================================================================
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// Import dari file-file proyek Anda
import { auth, db } from '../config/firebase'; // Impor 'auth' juga
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
import MetricCard from '../components/MetricCard';
import BottomNavBar from '../components/BottomNavBar';

function MainAppScreen(props) {
    const mapRef = useRef(null);
    const [userId, setUserId] = useState(''); // State ini sekarang akan diisi dengan benar
    const [isTracking, setIsTracking] = useState(false);
    const [isTrackingMode, setIsTrackingMode] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [duration, setDuration] = useState(0);
    const [distance, setDistance] = useState(0);
    const [calories, setCalories] = useState(0);
    const [path, setPath] = useState([]);
    const [locationSubscription, setLocationSubscription] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [pauseTime, setPauseTime] = useState(0);
    const [accumulatedPause, setAccumulatedPause] = useState(0);
    const [history, setHistory] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [elevationGain, setElevationGain] = useState(0);
    const [heartRates, setHeartRates] = useState([]);
    const [avgHeartRate, setAvgHeartRate] = useState(0);
    const [currentHR, setCurrentHR] = useState(150);
    const [userWeight, setUserWeight] = useState(70);

    const [initialRegion, setInitialRegion] = useState({
        latitude: -6.2088,
        longitude: 106.8456,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    // =================================================================
    // PERBAIKAN 2: Tambahkan useEffect untuk mendengarkan status auth
    // =================================================================
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Jika user ditemukan, set userId state
                setUserId(user.uid);
                console.log("User ID ditemukan di MainAppScreen:", user.uid);
            } else {
                console.log("Tidak ada user yang login di MainAppScreen.");
            }
        });

        return () => unsubscribe(); // Cleanup listener saat komponen unmount
    }, []);


    const resetTrackingState = () => {
        setIsTracking(false);
        setIsTrackingMode(false);
        setStartTime(null);
        setDuration(0);
        setDistance(0);
        setCalories(0);
        setPath([]);
        setSelectedActivity(null);
        setIsPaused(false);
        setPauseTime(0);
        setAccumulatedPause(0);
        setElevationGain(0);
        setHeartRates([]);
        setAvgHeartRate(0);
        setCurrentHR(150);
        if (locationSubscription) {
            locationSubscription.remove();
            setLocationSubscription(null);
        }
    };

    // ... (Sisa kode useEffect dan fungsi lainnya tetap sama) ...
    useEffect(() => {
        if (!db || !userId) return;
        const activitiesCollectionRef = collection(db, `artifacts/${APP_ID}/users/${userId}/activities`);
        const q = query(activitiesCollectionRef, orderBy('startTime', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(activitiesData);
        });
        return () => unsubscribe();
    }, [db, userId]);

    useEffect(() => {
        let interval;
        if (isTracking && !isPaused) {
            interval = setInterval(() => {
                setDuration(Date.now() - startTime - accumulatedPause);
            }, 1000);
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
    
      useEffect(() => {
        setElevationGain(calculateElevationGain(path));
        const finalCalculatedCalories = calculateCaloriesBurned(duration, userWeight, avgHeartRate, distance);
        setCalories(finalCalculatedCalories);
      }, [path, duration, avgHeartRate, distance]);
    
    
      useEffect(() => {
        setAvgHeartRate(calculateAvgHeartRate(heartRates));
      }, [heartRates]);
    
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

    const requestLocationPermission = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    };

    const startTracking = async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            Alert.alert('Location Permission Required', 'This app needs location permission to track your activity.');
            return;
        }
        resetTrackingState();
        setIsTracking(true);
        setIsTrackingMode(true);
        setStartTime(Date.now());

        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 1000,
                distanceInterval: 5,
            },
            (position) => {
                if (isPaused) return;

                const { latitude, longitude, altitude } = position.coords;
                const newPoint = { latitude, longitude, altitude: altitude || 0 };

                setPath((prevPath) => {
                    if (prevPath.length > 0) {
                        const lastPoint = prevPath[prevPath.length - 1];
                        const newDistance = calculateDistance(lastPoint.latitude, lastPoint.longitude, newPoint.latitude, newPoint.longitude);
                        setDistance((prevDistance) => prevDistance + newDistance);
                    }
                    return [...prevPath, newPoint];
                });

                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }, 1000);
                }
            }
        );
        setLocationSubscription(subscription);
    };

    const pauseTracking = () => {
        setIsPaused(true);
        setPauseTime(Date.now());
    };

    const resumeTracking = () => {
        setIsPaused(false);
        setAccumulatedPause((prev) => prev + (Date.now() - pauseTime));
        setPauseTime(0);
    };

    const stopTracking = async () => {
        setIsTracking(false);

        // =================================================================
        // PERBAIKAN 3: Kondisi ini sekarang akan terpenuhi karena userId sudah ada
        // =================================================================
        if (path.length > 0 && db && userId) {
            console.log(`Menyimpan aktivitas untuk user: ${userId}`); // Log untuk debugging
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
                    heartRates: heartRates,
                    avgHeartRate: calculateAvgHeartRate(heartRates),
                    elevationGain: calculateElevationGain(path)
                };
                const activitiesCollectionRef = collection(db, `artifacts/${APP_ID}/users/${userId}/activities`);
                await addDoc(activitiesCollectionRef, activityData);
                Alert.alert("Aktivitas Tersimpan!", "Data lari Anda berhasil disimpan.");
            } catch (e) {
                console.error("Error saat menyimpan dokumen: ", e);
                Alert.alert("Gagal Menyimpan", "Terjadi kesalahan saat menyimpan aktivitas.");
            }
        } else {
            // Log jika salah satu kondisi tidak terpenuhi
            console.log("Aktivitas tidak disimpan. Cek kondisi:", {
                pathLength: path.length,
                dbExists: !!db,
                userIdExists: !!userId
            });
        }
        resetTrackingState();
    };
    
    const handleTabPress = (tabName) => {
        if (tabName === 'Rekam') {
            startTracking();
        }
    };

    if (isTrackingMode) {
        return (
            <View style={{ flex: 1, backgroundColor: '#181A1B' }}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    followsUserLocation={true}
                    provider={PROVIDER_OSM}
                >
                    <Polyline coordinates={path} strokeWidth={6} strokeColor="#F54A38" />
                </MapView>
                <SafeAreaView style={styles.trackingOverlayContainer}>
                    <View style={styles.trackingMetricsContainer}>
                        <View style={styles.trackingMetricBox}>
                            <Text style={styles.trackingMetricLabel}>WAKTU</Text>
                            <Text style={styles.trackingMetricValue}>{formatDuration(duration)}</Text>
                        </View>
                        <View style={styles.trackingMetricBox}>
                            <Text style={styles.trackingMetricLabel}>JARAK (KM)</Text>
                            <Text style={styles.trackingMetricValue}>{(distance / 1000).toFixed(2)}</Text>
                        </View>
                    </View>
                </SafeAreaView>
                <View style={styles.trackingControlsContainer}>
                    {!isPaused ? (
                        <TouchableOpacity style={styles.controlButton} onPress={pauseTracking}>
                            <Ionicons name="pause-circle" size={80} color="#F54A38" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.controlButton} onPress={resumeTracking}>
                            <Ionicons name="play-circle" size={80} color="#F54A38" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.controlButton} onPress={stopTracking}>
                        <Ionicons name="stop-circle" size={80} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#181A1B' }}>
            <ScrollView contentContainerStyle={globalStyles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={globalStyles.container}>
                    <View style={globalStyles.header}>
                        <View style={globalStyles.headerIconWrapper}>
                            <Image source={require('../../assets/logonih.png')} style={globalStyles.headerIcon} />
                        </View>
                        <Text style={[globalStyles.headerTitle, { color: '#fff' }]}>Activity Tracker</Text>
                    </View>
                    {userId && (
                        <Text style={[globalStyles.userIdText, { color: '#aaa' }]}>
                            User ID: <Text style={globalStyles.userIdValue}>{userId}</Text>
                        </Text>
                    )}
                    
                    <>
                        <View style={globalStyles.metricsContainer}>
                            <MetricCard title="Distance" value={formatDistance(distance)} />
                            <MetricCard title="Avg Pace" value={formatPace(distance, duration)} />
                            <MetricCard title="Moving Time" value={formatDuration(duration)} />
                            <MetricCard title="Elevation Gain" value={formatElevationGain(elevationGain)} />
                            <MetricCard title="Calories" value={`${calories.toFixed(0)} Cal`} />
                            <MetricCard
                                title="Avg Heart Rate"
                                value={avgHeartRate ? `${avgHeartRate} bpm` : '-'}
                            />
                        </View>
                        <View style={globalStyles.mapSection}>
                            <Text style={globalStyles.sectionTitle}>Tracking Map</Text>
                            <View style={globalStyles.mapCard}>
                                <MapView
                                    ref={mapRef}
                                    style={globalStyles.map}
                                    initialRegion={initialRegion}
                                    showsUserLocation={true}
                                    provider={PROVIDER_OSM}
                                >
                                    {selectedActivity && selectedActivity.path.length > 0 && (
                                        <Polyline coordinates={selectedActivity.path} strokeWidth={5} strokeColor="#F54A38" />
                                    )}
                                </MapView>
                            </View>
                        </View>
                    </>
                    
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
            <BottomNavBar onTabPress={handleTabPress} />
        </View>
    );
}

const styles = StyleSheet.create({
    trackingOverlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    trackingMetricsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(24, 26, 27, 0.85)',
        borderRadius: 20,
        marginTop: 60,
        paddingVertical: 15,
        paddingHorizontal: 20,
        width: '90%',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    trackingMetricBox: {
        alignItems: 'center',
    },
    trackingMetricLabel: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: '600',
    },
    trackingMetricValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 5,
    },
    trackingControlsContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    controlButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default MainAppScreen;