// App.js

import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Animated, Easing } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

import AppNavigator from './src/navigation/AppNavigator';
import { auth } from './src/config/firebase'; // Pastikan path ini benar

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [userId, setUserId] = useState(null); // State untuk menyimpan user ID

  // Animasi untuk logo splash screen
  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1.1,
      duration: 1200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, []);
  
  // Cek status otentikasi Firebase saat aplikasi dimuat
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid);
        // Jika sudah ada user, tunggu sebentar lalu tampilkan aplikasi
        setTimeout(() => setIsLoading(false), 3000); // Durasi splash screen
      } else {
        // Jika belum ada, coba login secara anonim
        signInAnonymously(auth)
          .catch((error) => {
            console.error('Anonymous sign-in error:', error);
          })
          .finally(() => {
            // Setelah selesai (baik berhasil atau gagal), tampilkan aplikasi
            setTimeout(() => setIsLoading(false), 3000);
          });
      }
    });

    return () => unsubscribe();
  }, []);

  // Selama isLoading, tampilkan splash screen
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F54A38' }}>
        <Animated.Image
          source={require('./assets/splash.png')} // Pastikan path ini benar
          style={{ width: 132, height: 132, marginBottom: 24, transform: [{ scale: scaleAnim }] }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  
  // Jika sudah tidak loading, tampilkan navigator utama
  // Kita bisa meneruskan userId ke navigator jika diperlukan
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator screenProps={{ userId }} />
    </GestureHandlerRootView>
  );
}