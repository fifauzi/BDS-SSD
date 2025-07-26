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
    Dimensions,
    StyleSheet,
    SafeAreaView
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_OSM } from 'react-native-maps';
import * as Location from 'expo-location';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, ResponseType } from 'expo-auth-session';

// Import dari file-file yang ada
import { auth, db } from '../config/firebase';
import { APP_ID } from '../config/appConfig';
import {
    calculateDistance,
    formatDuration,
    formatDistance,
    formatPace, // <-- Ini adalah fungsi yang akan kita gunakan sebagai pace utama
    generateRealisticHeartRate,
    calculateCaloriesBurned,
    calculateElevationGain,
    calculateAvgHeartRate
} from '../utils/helpers';
import { globalStyles } from '../styles/GlobalStyles';

// Import komponen baru
import BottomNavBar from '../components/BottomNavBar';
import MetricCard from '../components/MetricCard';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

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
    const [currentHR, setCurrentHR] = useState(0);
    const [userWeight, setUserWeight] = useState(70);
    
    // --- DIHAPUS: State untuk currentPace tidak lagi diperlukan ---
    // const [currentPace, setCurrentPace] = useState('00:00');

    const [spotifyToken, setSpotifyToken] = useState(null);
    const [spotifyUserInfo, setSpotifyUserInfo] = useState(null);

    const [request, response, promptAsync] = useAuthRequest(
        {
          clientId: 'MASUKKAN_CLIENT_ID_SPOTIFY_ANDA',
          scopes: ['user-read-email', 'playlist-read-private', 'user-read-playback-state', 'user-modify-playback-state'],
          usePKCE: false,
          redirectUri: makeRedirectUri({
            useProxy: true,
          }),
          responseType: ResponseType.Token,
        },
        discovery
      );
    
    useEffect(() => {
        if (response?.type === 'success') {
          const { access_token } = response.params;
          setSpotifyToken(access_token);
          fetchSpotifyUserInfo(access_token);
        }
    }, [response]);

    const fetchSpotifyUserInfo = async (token) => {
        try {
          const result = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userInfo = await result.json();
          setSpotifyUserInfo(userInfo);
        } catch (error) {
          console.error("Error fetching Spotify user info:", error);
        }
    };

    const [initialRegion, setInitialRegion] = useState({
        latitude: -6.9175,
        longitude: 107.6191,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    const resetTrackingState = () => {
        setIsTracking(false);
        setIsTrackingMode(false);
        setStartTime(null);
        setDuration(0);
        setDistance(0);
        setCalories(0);
        setPath([]);
        // --- DIHAPUS: Reset currentPace tidak lagi diperlukan ---
        // setCurrentPace('00:00');
        setIsPaused(false);
        setPauseTime(0);
        setAccumulatedPause(0);
        setElevationGain(0);
        setHeartRates([]);
        setAvgHeartRate(0);
        setCurrentHR(0);

        if (locationSubscription) {
            locationSubscription.remove();
            setLocationSubscription(null);
        }
    };

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUserId(firebaseUser.uid);
                setTimeout(() => setIsLoading(false), 1500);
            } else {
                signInAnonymously(auth).catch((error) => console.error('Anonymous sign-in error:', error));
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!db || !userId) return;
        const activitiesCollectionRef = collection(db, `artifacts/${APP_ID}/users/${userId}/activities`);
        const q = query(activitiesCollectionRef, orderBy('startTime', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(activitiesData);
        }, (error) => console.error("Error fetching history:", error));
        return unsubscribe;
    }, [db, userId]);

    useEffect(() => {
        let interval;
        if (isTracking && !isPaused) {
            interval = setInterval(() => {
                const now = Date.now();
                setDuration(now - startTime - accumulatedPause);
                setCalories(calculateCaloriesBurned(now - startTime - accumulatedPause, userWeight, distance));
                
                setHeartRates(prevHRs => {
                    const lastHR = prevHRs.length > 0 ? prevHRs[prevHRs.length - 1] : 140;
                    const newHR = generateRealisticHeartRate(lastHR);
                    setCurrentHR(newHR);
                    return [...prevHRs, newHR];
                });

            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTracking, isPaused, startTime, accumulatedPause, distance, userWeight]);
    
    const requestLocationPermission = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    };

    const startTracking = async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            Alert.alert('Izin Lokasi Diperlukan', 'Aplikasi ini memerlukan izin lokasi untuk melacak aktivitas Anda.');
            return;
        }
        
        resetTrackingState(); 
        setIsTracking(true);
        setIsTrackingMode(true);
        setStartTime(Date.now());
        
        const subscription = await Location.watchPositionAsync(
            { 
                accuracy: Location.Accuracy.BestForNavigation, 
                timeInterval: 2000,
                distanceInterval: 5 
            },
            (position) => {
                if (isPaused) return;
                const { latitude, longitude, altitude, accuracy } = position.coords;
                if (accuracy && accuracy > 20) return;

                const newPoint = { latitude, longitude, altitude: altitude || 0, timestamp: Date.now() };

                setPath((prevPath) => {
                    const newPath = [...prevPath, newPoint];
                    if (prevPath.length > 0) {
                        const lastPoint = prevPath[prevPath.length - 1];
                        const distanceMoved = calculateDistance(lastPoint.latitude, lastPoint.longitude, newPoint.latitude, newPoint.longitude);
                        if (distanceMoved > 0) {
                            setDistance((prevDistance) => prevDistance + distanceMoved);
                        }
                    }
                    // --- DIHAPUS: Kalkulasi currentPace tidak lagi diperlukan ---
                    // const paceNow = calculateCurrentPace(newPath);
                    // setCurrentPace(paceNow);
                    return newPath;
                });

                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005,
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
        const finalCalculatedCalories = calculateCaloriesBurned(duration, userWeight, distance);
        const finalAvgHeartRate = calculateAvgHeartRate(heartRates);

        if (path.length > 0 && db && userId) {
            try {
                const activityData = {
                    startTime,
                    endTime: Date.now(),
                    duration,
                    distance,
                    calories: finalCalculatedCalories,
                    pace: formatPace(distance, duration),
                    path,
                    timestamp: Date.now(),
                    heartRates,
                    avgHeartRate: finalAvgHeartRate,
                    elevationGain: calculateElevationGain(path)
                };
                const activitiesCollectionRef = collection(db, `artifacts/${APP_ID}/users/${userId}/activities`);
                await addDoc(activitiesCollectionRef, activityData);
                console.log("Aktivitas berhasil disimpan!");
            } catch (e) {
                console.error("Gagal menyimpan dokumen: ", e);
            }
        }
        resetTrackingState();
    };

    const handleTabPress = (tabName) => {
        if (tabName === 'Record') {
            startTracking();
        } else {
            console.log(`Tab ${tabName} ditekan`);
        }
    };
    
    // --- DISESUAIKAN: Tampilan UI untuk Pace ---
    if (isTrackingMode) {
        return (
            <View style={styles.trackingContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.trackingMap}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    provider={PROVIDER_OSM}
                >
                    {path.length > 0 && (
                        <Polyline coordinates={path} strokeWidth={6} strokeColor="#F54A38" />
                    )}
                </MapView>
                
                <View style={styles.trackingOverlay}>
                    <View style={styles.trackingMetricsContainer}>
                        <View style={styles.trackingMetric}>
                            <Text style={styles.trackingMetricValue}>{formatPace(distance, duration)}</Text>
                            <Text style={styles.trackingMetricLabel}>Pace (/km)</Text>
                        </View>
                        <View style={styles.trackingMetric}>
                            <Text style={styles.trackingMetricValue}>{formatDistance(distance)}</Text>
                            <Text style={styles.trackingMetricLabel}>Jarak</Text>
                        </View>
                        <View style={styles.trackingMetric}>
                            <Text style={styles.trackingMetricValue}>{formatDuration(duration)}</Text>
                            <Text style={styles.trackingMetricLabel}>Waktu</Text>
                        </View>
                    </View>

                    {/* --- DIHAPUS: Tampilan secondary metric tidak lagi diperlukan karena pace sudah jadi satu --- */}
                    {/* <View style={styles.secondaryMetricsContainer}> ... </View> */}
                    
                    <View style={styles.calorieTracker}>
                        <Ionicons name="flame" size={20} color="#F54A38" />
                        <Text style={styles.calorieText}>{Math.round(calories)} kkal</Text>
                    </View>

                    <View style={styles.musicContainer}>
                        {!spotifyToken ? (
                            <TouchableOpacity style={styles.musicButton} onPress={() => promptAsync({ useProxy: true })}>
                                <FontAwesome5 name="spotify" size={20} color="#1DB954" />
                                <Text style={styles.musicButtonText}>Connect to Spotify</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.musicConnected}>
                                <FontAwesome5 name="spotify" size={20} color="#1DB954" />
                                <Text style={styles.musicConnectedText}>
                                    Connected as {spotifyUserInfo?.display_name || 'User'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.trackingControls}>
                        <View style={{flex: 1}} />
                        {isPaused ? (
                            <TouchableOpacity style={styles.centralControlButton} onPress={resumeTracking}>
                                <Ionicons name="play-circle" size={70} color="#FFFFFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.centralControlButton} onPress={pauseTracking}>
                                <Ionicons name="pause-circle" size={70} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.stopControlButton} onPress={stopTracking}>
                            <View style={styles.stopButtonInner}>
                               <Text style={styles.stopButtonText}>END</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // --- TAMPILAN NORMAL (KODE ASLI ANDA, TIDAK DIUBAH SAMA SEKALI) ---
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#181A1B' }}>
            <ScrollView contentContainerStyle={globalStyles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={globalStyles.container}>
                    <View style={globalStyles.header}>
                        <View style={globalStyles.headerIconWrapper}>
                            <Image source={require('../../assets/logonih.png')} style={globalStyles.headerIcon} />
                        </View>
                        <Text style={[globalStyles.headerTitle, { color: '#fff' }]}>Activity Tracker</Text>
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
                                {selectedActivity && selectedActivity.path && (
                                    <Polyline coordinates={selectedActivity.path} strokeWidth={5} strokeColor="#F54A38" />
                                )}
                            </MapView>
                        </View>
                    </View>

                    <View style={globalStyles.historySection}>
                        <Text style={[globalStyles.sectionTitle, { color: '#fff' }]}>Activity History</Text>
                        {history.length === 0 ? (
                            <Text style={[globalStyles.noHistoryText, { color: '#aaa' }]}>No activity history yet.</Text>
                        ) : (
                            <ScrollView style={globalStyles.historyList}>
                                {history.map((activity) => (
                                    <TouchableOpacity
                                        key={activity.id}
                                        style={[ globalStyles.historyItem, { backgroundColor: '#23242A', borderRadius: 12, borderColor: '#333' }]}
                                        onPress={() => props.navigation.navigate('ActivityHistoryDetail', { activity })}
                                    >
                                        <View style={globalStyles.historyItemContent}>
                                            <Text style={[globalStyles.historyItemTitle, { color: '#fff' }]}>Activity on {new Date(activity.startTime).toLocaleDateString()}</Text>
                                            <Text style={[globalStyles.historyItemDetail, { color: '#aaa' }]}>Duration: {formatDuration(activity.duration)} | Distance: {formatDistance(activity.distance)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </ScrollView>

            <BottomNavBar onTabPress={handleTabPress} />
        </SafeAreaView>
    );
}

// --- DISESUAIKAN: Style untuk komponen musik dan kalori ---
const styles = StyleSheet.create({
    trackingContainer: { flex: 1, backgroundColor: '#000' },
    trackingMap: { ...StyleSheet.absoluteFillObject },
    trackingOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(24, 26, 27, 0.9)', paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 30, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    trackingMetricsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    trackingMetric: { alignItems: 'center', flex: 1 },
    trackingMetricValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '600' },
    trackingMetricLabel: { color: '#8e8e93', fontSize: 14, marginTop: 4 },
    
    calorieTracker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    calorieText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 8,
    },
    musicContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    musicButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#282828',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 50,
    },
    musicButtonText: {
        color: '#FFFFFF',
        marginLeft: 10,
        fontWeight: 'bold',
        fontSize: 16,
    },
    musicConnected: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(29, 185, 84, 0.2)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 50,
    },
    musicConnectedText: {
        color: '#1DB954',
        marginLeft: 10,
        fontWeight: 'bold',
        fontSize: 16,
    },
    trackingControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    centralControlButton: { flex: 2, alignItems: 'center', justifyContent: 'center' },
    stopControlButton: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    stopButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#D90429', justifyContent: 'center', alignItems: 'center' },
    stopButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});
    
export default MainAppScreen;
