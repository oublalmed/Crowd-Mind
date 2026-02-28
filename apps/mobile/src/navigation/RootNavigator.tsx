import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthStore } from '../store/authStore';
import AuthStack from './AuthStack';
import MainTabNavigator from './MainTabNavigator';
import GameStack from './GameStack';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Game: { roomId: string; gameMode: string };
  GameResults: { gameId: string };
  PlayerProfile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="Game"
            component={GameStack}
            options={{
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
