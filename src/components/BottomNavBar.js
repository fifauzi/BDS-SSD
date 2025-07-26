// src/components/BottomNavBar.js

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // <-- 1. Impor BlurView

const BottomNavBar = ({ onTabPress }) => {
  const [activeTab, setActiveTab] = useState('Rekam');

  const handlePress = (tabName) => {
    setActiveTab(tabName);
    if (onTabPress) {
      onTabPress(tabName);
    }
  };

  const navItems = [
    { name: 'Home', icon: 'home', lib: Ionicons },
    { name: 'Maps', icon: 'map-marked-alt', lib: FontAwesome5 },
    { name: 'Record', icon: 'radio-button-on', lib: Ionicons, isCentral: true },
    { name: 'Group', icon: 'account-group', lib: MaterialCommunityIcons },
    { name: 'Pofile', icon: 'person', lib: Ionicons },
  ];

  return (
    // 2. Gunakan BlurView sebagai container utama
    <BlurView
      intensity={Platform.OS === 'ios' ? 70 : 100} // Intensitas blur
      tint="dark" // Tema blur (light, dark, default)
      style={styles.navContainer}
    >
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.name}
          style={styles.navItem}
          onPress={() => handlePress(item.name)}
          activeOpacity={0.7}
        >
          {item.isCentral ? (
            <View style={styles.centralIconWrapper}>
                <item.lib
                    name={item.icon}
                    size={65}
                    color="#F54A38"
                />
            </View>
          ) : (
            <>
              <item.lib
                name={item.icon}
                size={26}
                color={activeTab === item.name ? '#FFFFFF' : '#8e8e93'}
              />
              <Text style={[styles.navText, activeTab === item.name && styles.navTextActive]}>
                {item.name}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ))}
    </BlurView>
  );
};

// 3. Stylesheet baru untuk tampilan floating glass
const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 35, // Jarak dari bawah layar
    left: 20,
    right: 20,
    flexDirection: 'row',
    height: 75,
    borderRadius: 25, // Sudut yang lebih rounded
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Border tipis untuk efek kaca
    overflow: 'hidden', // Wajib untuk BlurView dengan borderRadius
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centralIconWrapper: {
    // Tombol tengah tidak lagi diangkat, tapi menyatu dengan dock
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 4,
  },
  navTextActive: {
    color: '#FFFFFF', // Teks aktif sekarang putih agar kontras
    fontWeight: '600',
  },
});

export default BottomNavBar;