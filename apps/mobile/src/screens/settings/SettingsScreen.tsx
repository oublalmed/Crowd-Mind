import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius } from '../../theme';

interface SettingToggle {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NOTIFICATION_SETTINGS: SettingToggle[] = [
  { key: 'push_enabled', label: 'Push Notifications', description: 'Receive push notifications', icon: 'notifications-outline' },
  { key: 'game_invites', label: 'Game Invites', description: 'Get notified when friends invite you', icon: 'game-controller-outline' },
  { key: 'vote_results', label: 'Vote Results', description: 'Results from games you played', icon: 'bar-chart-outline' },
  { key: 'leaderboard_changes', label: 'Leaderboard Updates', description: 'Rank changes and milestones', icon: 'trophy-outline' },
];

const GAMEPLAY_SETTINGS: SettingToggle[] = [
  { key: 'sound_effects', label: 'Sound Effects', description: 'In-game sounds and feedback', icon: 'volume-high-outline' },
  { key: 'vibration', label: 'Haptic Feedback', description: 'Vibration on interactions', icon: 'phone-portrait-outline' },
  { key: 'auto_ready', label: 'Auto-Ready', description: 'Automatically ready up in lobbies', icon: 'flash-outline' },
];

const SettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [settings, setSettings] = useState<Record<string, boolean>>({
    push_enabled: true,
    game_invites: true,
    vote_results: true,
    leaderboard_changes: false,
    sound_effects: true,
    vibration: true,
    auto_ready: false,
  });

  const handleToggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear cached data. Your account and progress are safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const renderToggleSection = (title: string, items: SettingToggle[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item.key} style={styles.settingRow}>
          <View style={styles.settingIconContainer}>
            <Ionicons name={item.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text style={styles.settingDescription}>{item.description}</Text>
          </View>
          <Switch
            value={settings[item.key]}
            onValueChange={() => handleToggle(item.key)}
            trackColor={{ false: colors.backgroundElevated, true: colors.primary + '60' }}
            thumbColor={settings[item.key] ? colors.primary : colors.textMuted}
          />
        </View>
      ))}
    </View>
  );

  const renderLinkRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    destructive = false
  ) => (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={20} color={destructive ? colors.error : colors.textSecondary} />
      </View>
      <Text style={[styles.linkLabel, destructive && styles.linkLabelDestructive]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        {renderToggleSection('Notifications', NOTIFICATION_SETTINGS)}

        {/* Gameplay */}
        {renderToggleSection('Gameplay', GAMEPLAY_SETTINGS)}

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {renderLinkRow('person-outline', 'Edit Profile', () => {})}
          {renderLinkRow('shield-checkmark-outline', 'Privacy Policy', () => {})}
          {renderLinkRow('document-text-outline', 'Terms of Service', () => {})}
          {renderLinkRow('help-circle-outline', 'Help & Support', () => {})}
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          {renderLinkRow('trash-outline', 'Clear Cache', handleClearCache)}
          {renderLinkRow('close-circle-outline', 'Delete Account', handleDeleteAccount, true)}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Crowd Mind</Text>
          <Text style={styles.appVersion}>Version 0.1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  // ScrollView
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  // Toggle rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settingLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  settingDescription: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Link rows
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkLabel: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text,
  },
  linkLabelDestructive: {
    color: colors.error,
  },
  // App info
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  appVersion: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default SettingsScreen;
