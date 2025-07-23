// src/components/MetricCard.js

import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles } from '../styles/GlobalStyles'; // Import dari file styles yang baru

const MetricCard = ({ title, value }) => (
  <View style={globalStyles.metricCard}>
    <Text style={globalStyles.metricTitle}>{title}</Text>
    <Text style={globalStyles.metricValue}>{value}</Text>
  </View>
);

export default MetricCard;