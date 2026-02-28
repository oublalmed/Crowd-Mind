import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/common/Button';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

interface OnboardingPage {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const pages: OnboardingPage[] = [
  {
    id: '1',
    icon: 'people',
    title: 'Vote with the Crowd',
    description:
      'Join live rooms and vote on questions together. The wisdom of the crowd decides the outcome -- think fast and think smart!',
    accentColor: colors.primary,
  },
  {
    id: '2',
    icon: 'game-controller',
    title: 'Compete & Strategize',
    description:
      'Match your instincts against other players in real-time. Multiple game modes keep every round fresh and exciting.',
    accentColor: colors.secondary,
  },
  {
    id: '3',
    icon: 'trophy',
    title: 'Climb the Ranks',
    description:
      'Earn points, unlock achievements, and rise through the leaderboards. Prove you have the sharpest crowd instincts!',
    accentColor: colors.gold,
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);

  const isLastPage = activeIndex === pages.length - 1;

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const handleNext = () => {
    if (isLastPage) {
      navigation.replace('Login');
    } else {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderPage = ({ item }: { item: OnboardingPage }) => (
    <View style={styles.page}>
      <View style={styles.illustrationContainer}>
        <View
          style={[
            styles.iconCircle,
            { borderColor: item.accentColor },
          ]}
        >
          <View
            style={[
              styles.iconInner,
              { backgroundColor: `${item.accentColor}20` },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={72}
              color={item.accentColor}
            />
          </View>
        </View>
        {/* Decorative dots */}
        <View
          style={[
            styles.decorDot,
            styles.decorDotTopLeft,
            { backgroundColor: item.accentColor },
          ]}
        />
        <View
          style={[
            styles.decorDot,
            styles.decorDotTopRight,
            { backgroundColor: item.accentColor },
          ]}
        />
        <View
          style={[
            styles.decorDot,
            styles.decorDotBottomLeft,
            { backgroundColor: item.accentColor },
          ]}
        />
        <View
          style={[
            styles.decorDot,
            styles.decorDotBottomRight,
            { backgroundColor: item.accentColor },
          ]}
        />
      </View>
      <Text style={styles.pageTitle}>{item.title}</Text>
      <Text style={styles.pageDescription}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {!isLastPage && (
          <Button title="Skip" onPress={handleSkip} variant="ghost" />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {pages.map((page, index) => (
          <View
            key={page.id}
            style={[
              styles.dot,
              index === activeIndex && [
                styles.dotActive,
                { backgroundColor: pages[activeIndex].accentColor },
              ],
            ]}
          />
        ))}
      </View>

      {/* Bottom button */}
      <View style={styles.bottomContainer}>
        <Button
          title={isLastPage ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    minHeight: 52,
  },
  page: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.4,
  },
  decorDotTopLeft: {
    top: 10,
    left: 20,
  },
  decorDotTopRight: {
    top: 30,
    right: 10,
  },
  decorDotBottomLeft: {
    bottom: 30,
    left: 10,
  },
  decorDotBottomRight: {
    bottom: 10,
    right: 20,
  },
  pageTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.extrabold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pageDescription: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.lg * typography.lineHeight.relaxed,
    paddingHorizontal: spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

export default OnboardingScreen;
