import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/home/HomeScreen';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import ShopScreen from '../screens/shop/ShopScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import { colors, typography } from '../theme';

export type MainTabParamList = {
  Home: undefined;
  Leaderboard: undefined;
  Shop: undefined;
  Profile: undefined;
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const getTabIcon = (
  route: string,
  focused: boolean
): keyof typeof Ionicons.glyphMap => {
  const icons: Record<string, { active: string; inactive: string }> = {
    Home: { active: 'game-controller', inactive: 'game-controller-outline' },
    Leaderboard: { active: 'trophy', inactive: 'trophy-outline' },
    Shop: { active: 'cart', inactive: 'cart-outline' },
    Profile: { active: 'person', inactive: 'person-outline' },
    Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  };
  const icon = icons[route];
  return (focused ? icon?.active : icon?.inactive) as keyof typeof Ionicons.glyphMap;
};

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.backgroundCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Play' }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ tabBarLabel: 'Ranks' }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{ tabBarLabel: 'Shop' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarBadge: 3,
          tabBarBadgeStyle: {
            backgroundColor: colors.accent,
            fontSize: typography.size.xs,
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
