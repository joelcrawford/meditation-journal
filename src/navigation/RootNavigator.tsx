import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import {HomeScreen} from '../screens/HomeScreen';
import {BeforeScreen} from '../screens/BeforeScreen';
import {TimerScreen} from '../screens/TimerScreen';
import {AfterScreen} from '../screens/AfterScreen';
import {CheckinModal} from '../screens/CheckinModal';
import {CheckinResultScreen} from '../screens/CheckinResultScreen';
import {MeditationObjectSheet} from '../screens/MeditationObjectSheet';
import {SettingsScreen} from '../screens/SettingsScreen';
import {BellPickerScreen} from '../screens/BellPickerScreen';
import {Colors} from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Before" component={BeforeScreen} />
      <Stack.Screen name="Timer" component={TimerScreen} />
      <Stack.Screen name="After" component={AfterScreen} />
      <Stack.Screen
        name="CheckinModal"
        component={CheckinModal}
        options={{presentation: 'modal'}}
      />
      <Stack.Screen
        name="CheckinResult"
        component={CheckinResultScreen}
        options={{presentation: 'modal'}}
      />
      <Stack.Screen
        name="MeditationObjectSheet"
        component={MeditationObjectSheet}
        options={{
          presentation: 'modal',
          contentStyle: {backgroundColor: Colors.paperCard},
        }}
      />
      <Stack.Screen
        name="BellPicker"
        component={BellPickerScreen}
        options={{headerShown: true, title: 'Bell sound', headerBackTitle: 'Settings'}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{headerShown: true, title: 'Settings', headerBackTitle: 'Home'}}
      />
    </Stack.Navigator>
  );
}
