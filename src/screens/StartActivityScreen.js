// src/screens/StartActivityScreen.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const StartActivityScreen = ({ navigation }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef();
  const [selectedSport, setSelectedSport] = useState('Select Sport');
  // State baru untuk mengontrol visibilitas kartu aktivitas
  const [isActivityBoxVisible, setIsActivityBoxVisible] = useState(true);

  const backgroundImages = [
    require('../../assets/start0.jpg'),
    require('../../assets/start2.jpg'),
    require('../../assets/start3.jpg'),
    require('../../assets/start4.jpg'),
  ];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % backgroundImages.length);
    }, 3000);

    return () => clearInterval(slideInterval);
  }, [backgroundImages.length]);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({
      x: currentImageIndex * width,
      animated: true,
    });
  }, [currentImageIndex]);

  const sports = [
    { name: 'Cycling', icon: 'bicycle' },
    { name: 'Running', icon: 'running' },
    { name: 'Hiking', icon: 'hiking' },
    { name: 'Walking', icon: 'walking' },
  ];

  const handleStart = () => {
    navigation.navigate('MainApp');
  };

  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);

    if (currentImageIndex !== roundIndex) {
      setCurrentImageIndex(roundIndex);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.backgroundImageScrollView}
      >
        {backgroundImages.map((image, index) => (
          <Image key={index} source={image} style={styles.backgroundImage} resizeMode="cover" />
        ))}
      </ScrollView>
      <View style={styles.overlay} />

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Image source={require('../../assets/splash.png')} style={styles.headerLogo} />
          {/* <Text style={styles.headerTitle}>STRAVA</Text> */}
        </View>

        {/* ================================================================= */}
        {/* KARTU AKTIVITAS SEKARANG KONDISIONAL BERDASARKAN STATE */}
        {/* ================================================================= */}
        {isActivityBoxVisible && (
          <View style={styles.activityBox}>
            <View style={styles.activityHeader}>
              {/* ================================================================= */}
              {/* PERBAIKAN: Tombol "Tutup" diganti ikon X dan diberi aksi */}
              {/* ================================================================= */}
              <TouchableOpacity onPress={() => setIsActivityBoxVisible(false)}>
                <Ionicons name="close-circle-outline" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.activityTitle}>{selectedSport}</Text>
              <TouchableOpacity>
                <Ionicons name="settings-sharp" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.sportSelector}>
              <Text style={styles.selectorTitle}>Select Sport</Text>
              <View style={styles.sportIconsContainer}>
                {sports.map(sport => (
                  <TouchableOpacity
                    key={sport.name}
                    style={styles.sportIconWrapper}
                    onPress={() => setSelectedSport(sport.name)}
                  >
                    <View style={[styles.iconCircle, selectedSport === sport.name && styles.iconCircleActive]}>
                      <FontAwesome5 name={sport.icon} size={24} color={selectedSport === sport.name ? '#fff' : '#F54A38'} />
                    </View>
                    <Text style={[styles.sportName, selectedSport === sport.name && styles.sportNameActive]}>
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Jika kartu ditutup, tampilkan tombol untuk membukanya lagi */}
        {!isActivityBoxVisible && (
            <TouchableOpacity style={styles.openCardButton} onPress={() => setIsActivityBoxVisible(true)}>
                <Text style={styles.openCardButtonText}>Select Sport</Text>
            </TouchableOpacity>
        )}


        <View style={styles.footer}>
          <Text style={styles.footerText}>Take your coffee burn our spirits!</Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>Let's Record</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A1B',
  },
  backgroundImageScrollView: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 26, 27, 0.7)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLogo: {
    width: 120,
    height: 90,
    resizeMode: 'contain',
  },
  activityBox: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 15,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  activityTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sportSelector: {
    paddingHorizontal: 15,
    marginTop: 15,
  },
  selectorTitle: {
    color: '#aaa',
    marginBottom: 10,
  },
  sportIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sportIconWrapper: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  iconCircleActive: {
    backgroundColor: '#F54A38',
  },
  sportName: {
    color: '#fff',
  },
  sportNameActive: {
    color: '#F54A38',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#F54A38',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Style baru untuk tombol "Pilih Aktivitas"
  openCardButton: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  openCardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default StartActivityScreen;