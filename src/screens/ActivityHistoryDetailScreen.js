// src/screens/ActivityHistoryDetailScreen.js

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'; // <-- Pastikan TouchableOpacity ada di sini
import MapView, { Polyline, Marker, PROVIDER_OSM } from 'react-native-maps';
import { formatDistance, formatDuration, formatElevationGain } from '../utils/helpers';
import { shareStyles } from '../styles/ShareActivityStyles';

const ActivityHistoryDetailScreen = ({ route, navigation }) => {
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
              latitude: -6.2088, // Default jika tidak ada path
              longitude: 106.8456,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            provider={PROVIDER_OSM} // Menggunakan OpenStreetMap
            // customMapStyle={[]} // Tidak perlu customMapStyle untuk OSM
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
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{formatElevationGain(activity.elevationGain)}</Text>
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
        <TouchableOpacity style={{ backgroundColor: '#F54A38', borderRadius: 12, marginHorizontal: 24, marginBottom: 12, paddingVertical: 16, alignItems: 'center', shadowColor: '#F54A38', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>View Analysis</Text>
        </TouchableOpacity>
        {/* Share Button */}
        <TouchableOpacity 
          style={{ backgroundColor: '#23242A', borderRadius: 12, marginHorizontal: 24, marginBottom: 24, paddingVertical: 16, alignItems: 'center', shadowColor: '#F54A38', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3, borderWidth: 1.5, borderColor: '#F54A38' }}
          onPress={() => navigation.navigate('ShareActivity', { activity })}
        >
          <Text style={{ color: '#F54A38', fontWeight: 'bold', fontSize: 18 }}>Share Activity</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ActivityHistoryDetailScreen;