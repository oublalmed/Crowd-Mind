import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LobbyScreen from '../screens/game/LobbyScreen';
import ActiveGameScreen from '../screens/game/ActiveGameScreen';
import ResultsScreen from '../screens/game/ResultsScreen';

export type GameStackParamList = {
  Lobby: { roomId: string; gameMode: string };
  ActiveGame: { roomId: string; gameMode: string };
  Results: { gameId: string; roomId: string };
};

const Stack = createNativeStackNavigator<GameStackParamList>();

const GameStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Lobby" component={LobbyScreen} />
      <Stack.Screen name="ActiveGame" component={ActiveGameScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
    </Stack.Navigator>
  );
};

export default GameStack;
