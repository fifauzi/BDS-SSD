// src/screens/ShareActivityScreen.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Image, TouchableWithoutFeedback, ImageBackground, Dimensions } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps'; // <<< PROVIDER_GOOGLE
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { shareStyles } from '../styles/ShareActivityStyles';
import SuccessModal from '../components/SuccessModal';
import {
  formatDistance,
  formatDuration,
  formatElevationGain,
  formatPace,
} from '../utils/helpers';


const windowHeight = Dimensions.get('window').height;

const ShareActivityScreen = ({ route, navigation }) => {
  const { activity } = route.params;
  const viewShotRef = useRef();
  const activityDate = activity.startTime ? new Date(activity.startTime) : null;
  const mapRef = useRef(null);

  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [hasImagePickerPermission, setHasImagePickerPermission] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [isTransparentBackground, setIsTransparentBackground] = useState(false);

  useEffect(() => {
    (async () => {
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      setHasMediaLibraryPermission(mediaStatus.status === 'granted');

      const imagePickerStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasImagePickerPermission(imagePickerStatus.status === 'granted');
    })();
  }, []);

  const saveShareCard = async () => {
    if (viewShotRef.current) {
      if (hasMediaLibraryPermission === false) {
        Alert.alert('Permission Denied', 'Please grant media library permissions to save the image.');
        return;
      }
      try {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        setShowSuccessModal(true);
      } catch (error) {
        console.error('Failed to save share card:', error);
        Alert.alert('Error', 'Failed to save share card.');
      }
    }
  };

  const pickImage = async () => {
    if (hasImagePickerPermission === false) {
      Alert.alert('Permission Denied', 'Please grant photo library permissions to pick an image.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setBackgroundImage(result.assets[0].uri);
      setIsTransparentBackground(false);
    }
  };

  const setBackgroundToDefaultBlack = () => {
    setBackgroundImage(null);
    setIsTransparentBackground(false);
  };

  const setBackgroundToTransparent = () => {
    setBackgroundImage(null);
    setIsTransparentBackground(true);
  };

  const clearBackgroundImage = () => {
    setBackgroundImage(null);
    setIsTransparentBackground(false);
  };

  const getMapTypeForShare = () => {
    return "standard";
  };

  const getCustomMapStyleForShare = () => {
    return [
      { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "all", elementType: "geometry", stylers: [{ visibility: "off" }] },
      { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#000000" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#000000" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
    ];
  };

  return (
    <View style={shareStyles.container}>
      <TouchableOpacity style={shareStyles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={shareStyles.closeButtonText}>X</Text>
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={shareStyles.modalScrollViewContent} showsVerticalScrollIndicator={false}>

        {/* Share Card Wrapper */}
        <ViewShot 
          ref={viewShotRef} 
          options={{ 
              format: 'png', 
              quality: 0.9, 
              backgroundColor: isTransparentBackground ? 'transparent' : '#161316' 
          }}
          style={shareStyles.shareCardWrapper}
        >
          <ImageBackground 
            source={backgroundImage ? { uri: backgroundImage } : undefined} 
            style={shareStyles.shareCard} 
            imageStyle={{ borderRadius: 20 }}
            resizeMode="cover" 
          >
            {/* Overlay for opacity effect when a background image is used */}
            {(!isTransparentBackground && backgroundImage) && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black', opacity: overlayOpacity, borderRadius: 20 }]} />
            )}

            {/* Content container within the ImageBackground */}
            <View style={[shareStyles.shareCardContent, 
                          (!backgroundImage && !isTransparentBackground) ? {backgroundColor: '#161316'} : {} ]}>
              {/* Map Section */}
              <View style={shareStyles.shareMapContainer}>
                <MapView
                  ref={mapRef}
                  style={[shareStyles.shareMap, {
                      backgroundColor: isTransparentBackground ? 'transparent' : 'black'
                  }]}
                  initialRegion={activity.path && activity.path.length > 0 ? {
                    latitude: activity.path[0].latitude,
                    longitude: activity.path[0].longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  } : {
                    latitude: -6.2088, // Default jika tidak ada path
                    longitude: 106.8456,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  provider={PROVIDER_GOOGLE} // PROVIDER_GOOGLE
                  mapType={getMapTypeForShare()}
                  customMapStyle={getCustomMapStyleForShare()}
                  liteMode={true}
                  onLayout={() => {
                    if (mapRef.current && activity.path && activity.path.length > 0) {
                      mapRef.current.fitToCoordinates(activity.path, {
                        edgePadding: { top: 20, right: 20, bottom: 20, left: 20 },
                        animated: false,
                      });
                    }
                  }}
                  // Properti untuk menyembunyikan kontrol UI Google Maps lainnya
                  moveOnMarkerPress={false} 
                  pitchEnabled={false} 
                  rotateEnabled={false} 
                  scrollEnabled={false} 
                  zoomEnabled={false} 
                  toolbarEnabled={false} 
                  showsCompass={false} 
                  showsScale={false} 
                  showsTraffic={false} 
                  showsIndoors={false} 
                  showsBuildings={false} 
                  showsMyLocationButton={false} 
                  showsPointsOfInterest={false} 
                >
                  {activity.path && activity.path.length > 0 && (
                    <>
                      <Polyline coordinates={activity.path} strokeWidth={6} strokeColor="#F54A38" /> 
                      {/* Marker sudah dihilangkan sesuai permintaan sebelumnya */}
                    </>
                  )}
                  {/* ========================================================================= */}
                  {/* TAMBAHKAN VIEW INI UNTUK MENUTUPI LOGO GOOGLE */}
                  {/* ========================================================================= */}
                  <View style={shareStyles.googleLogoOverlay} /> 
                </MapView>
              </View>
              
              {/* Metrics Section (Scrollable) */}
              <ScrollView style={shareStyles.metricsScrollView} contentContainerStyle={shareStyles.shareMetricsScrollContentInner}>
                <Text style={shareStyles.shareTitle}>My Activity</Text>
                {activityDate && (
                  <Text style={shareStyles.shareDate}>
                    {activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                )}
                <View style={shareStyles.shareRow}>
                  <View style={shareStyles.shareMetricItem}>
                    <Text style={shareStyles.shareMetricValue}>{formatDistance(activity.distance)}</Text>
                    <Text style={shareStyles.shareMetricLabel}>Distance</Text>
                  </View>
                  <View style={shareStyles.shareMetricItem}>
                    <Text style={shareStyles.shareMetricValue}>{formatPace(activity.distance, activity.duration)}</Text>
                    <Text style={shareStyles.shareMetricLabel}>Pace</Text>
                  </View>
                </View>
                <View style={shareStyles.shareRow}>
                  <View style={shareStyles.shareMetricItem}>
                    <Text style={shareStyles.shareMetricValue}>{formatDuration(activity.duration)}</Text>
                    <Text style={shareStyles.shareMetricLabel}>Duration</Text>
                  </View>
                  <View style={shareStyles.shareMetricItem}>
                    <Text style={shareStyles.shareMetricValue}>{formatElevationGain(activity.elevationGain)}</Text>
                    <Text style={shareStyles.shareMetricLabel}>Elevation Gain</Text>
                  </View>
                </View>
                <View style={shareStyles.shareRow}>
                  <View style={shareStyles.shareMetricItem}>
                    <Text style={shareStyles.shareMetricValue}>{activity.calories ? `${activity.calories.toFixed(0)} Cal` : '0 Cal'}</Text>
                    <Text style={shareStyles.shareMetricLabel}>Calories</Text>
                  </View>
                  <View style={shareStyles.shareMetricItem}>
                    <Text style={shareStyles.shareMetricValue}>{activity.avgHeartRate ? `${activity.avgHeartRate} bpm` : '-'}</Text>
                    <Text style={shareStyles.shareMetricLabel}>Avg Heart Rate</Text>
                  </View>
                </View>
                {/* Logo / Source text */}
                <View style={shareStyles.shareSourceContainer}>
                  <Image source={require('../../assets/sharelogo.png')} style={shareStyles.shareLogo} />
                  <Text style={shareStyles.shareSourceText}>#TAKEYOURCOFFEEBURNOURSPIRITS</Text>
                </View>
              </ScrollView>
            </View>
          </ImageBackground>
        </ViewShot>

        {/* Background Options */}
        <View style={shareStyles.backgroundOptionsContainer}>
          <Text style={shareStyles.optionTitle}>Background Options:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={shareStyles.optionButtonsScroll}>
              <TouchableOpacity 
                  style={[shareStyles.optionButton, (!backgroundImage && !isTransparentBackground) && shareStyles.optionButtonActive]} 
                  onPress={setBackgroundToDefaultBlack}
              >
                  <Text style={[shareStyles.optionButtonText, (!backgroundImage && !isTransparentBackground) && shareStyles.optionButtonTextActive]}>Default</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                  style={[shareStyles.optionButton, isTransparentBackground && shareStyles.optionButtonActive]} 
                  onPress={setBackgroundToTransparent}
              >
                  <Text style={[shareStyles.optionButtonText, isTransparentBackground && shareStyles.optionButtonTextActive]}>Transparent</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                  style={[shareStyles.optionButton, backgroundImage && shareStyles.optionButtonActive]} 
                  onPress={pickImage}
              >
                  <Text style={[shareStyles.optionButtonText, backgroundImage && shareStyles.optionButtonTextActive]}>Upload Photo</Text>
              </TouchableOpacity>
              {backgroundImage && (
                  <TouchableOpacity style={[shareStyles.optionButton, shareStyles.clearBackgroundOptionButton]} onPress={clearBackgroundImage}>
                      <Text style={shareStyles.optionButtonText}>Clear Photo</Text>
                  </TouchableOpacity>
              )}
          </ScrollView>
        </View>

        {/* Opacity Slider for Overlay (only if backgroundImage is present and not transparent mode) */}
        {(backgroundImage && !isTransparentBackground) && (
          <View style={shareStyles.opacitySliderContainer}>
            <Text style={shareStyles.opacityLabel}>Overlay Opacity:</Text>
            <Slider
              style={shareStyles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.1}
              value={overlayOpacity}
              onValueChange={setOverlayOpacity}
              minimumTrackTintColor="#F54A38"
              maximumTrackTintColor="#aaa"
              thumbTintColor="#F54A38"
            />
            <Text style={shareStyles.opacityValue}>{(overlayOpacity * 100).toFixed(0)}%</Text>
          </View>
        )}

        {/* Main Action Button */}
        <TouchableOpacity style={shareStyles.downloadButton} onPress={saveShareCard}>
          <Text style={shareStyles.downloadButtonText}>Download as PNG</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Custom Success Modal */}
      <SuccessModal visible={showSuccessModal} onClose={() => setShowSuccessModal(false)} />
    </View>
  );
};

export default ShareActivityScreen;