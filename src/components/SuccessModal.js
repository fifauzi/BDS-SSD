// src/components/SuccessModal.js

import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, Image, Animated, Easing } from 'react-native';
import { shareStyles } from '../styles/ShareActivityStyles'; // Import dari file styles yang baru

const SuccessModal = ({ visible, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        onClose();
      }, 2000); // Auto-hide after 2 seconds
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const CheckIconComponent = () => {
    try {
      return <Image source={require('../../assets/sharelogo.png')} style={[shareStyles.successIcon, {tintColor: '#28a745'}]} />;
    } catch (e) {
      console.warn("sharelogo.png for success icon not found or could not be loaded, using text as placeholder.", e);
      return <Text style={shareStyles.successIconPlaceholder}>✓</Text>;
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={shareStyles.modalBackground}>
        <Animated.View style={[shareStyles.successModalContent, { transform: [{ scale: scaleAnim }] }]}>
          <CheckIconComponent />
          <Text style={shareStyles.successText}>Saved to Gallery!</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default SuccessModal;