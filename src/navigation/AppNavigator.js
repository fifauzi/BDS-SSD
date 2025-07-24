// src/navigation/AppNavigator.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import MainAppScreen from '../screens/MainAppScreen';
import ActivityHistoryDetailScreen from '../screens/ActivityHistoryDetailScreen';
import ShareActivityScreen from '../screens/ShareActivityScreen';
import StartActivityScreen from '../screens/StartActivityScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="StartActivity" // <-- Ini adalah kunci utamanya
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="StartActivity" component={StartActivityScreen} />
        <Stack.Screen name="MainApp" component={MainAppScreen} />
        <Stack.Screen name="ActivityHistoryDetail" component={ActivityHistoryDetailScreen} />
        <Stack.Screen name="ShareActivity" component={ShareActivityScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;