import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Card from '../../components/common/Card';
import paymentService from '../../services/paymentService';

type ShopTab = 'avatars' | 'themes' | 'powerups';

interface ShopItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  price: number;
  currency: 'coins' | 'gems';
  isFeatured?: boolean;
  isOwned?: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

const SHOP_TABS: { key: ShopTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'avatars', label: 'Avatars', icon: 'happy-outline' },
  { key: 'themes', label: 'Themes', icon: 'color-palette-outline' },
  { key: 'powerups', label: 'Power-Ups', icon: 'flash-outline' },
];

const SHOP_ITEMS: Record<ShopTab, ShopItem[]> = {
  avatars: [
    { id: 'a1', name: 'Cyber Wolf', icon: 'paw', iconColor: '#6C5CE7', price: 500, currency: 'coins', rarity: 'rare', isFeatured: true },
    { id: 'a2', name: 'Neon Ghost', icon: 'skull', iconColor: '#00CEC9', price: 750, currency: 'coins', rarity: 'epic' },
    { id: 'a3', name: 'Fire Phoenix', icon: 'flame', iconColor: '#E17055', price: 50, currency: 'gems', rarity: 'legendary' },
    { id: 'a4', name: 'Storm Eye', icon: 'eye', iconColor: '#74B9FF', price: 300, currency: 'coins', rarity: 'common' },
    { id: 'a5', name: 'Dark Knight', icon: 'shield', iconColor: '#A29BFE', price: 600, currency: 'coins', rarity: 'rare' },
    { id: 'a6', name: 'Star Walker', icon: 'star', iconColor: '#FDCB6E', price: 35, currency: 'gems', rarity: 'epic', isOwned: true },
  ],
  themes: [
    { id: 't1', name: 'Neon Nights', icon: 'moon', iconColor: '#6C5CE7', price: 1000, currency: 'coins', rarity: 'rare', isFeatured: true },
    { id: 't2', name: 'Ocean Depths', icon: 'water', iconColor: '#00CEC9', price: 800, currency: 'coins', rarity: 'rare' },
    { id: 't3', name: 'Lava Flow', icon: 'bonfire', iconColor: '#E17055', price: 75, currency: 'gems', rarity: 'legendary' },
    { id: 't4', name: 'Frost Bite', icon: 'snow', iconColor: '#81ECEC', price: 600, currency: 'coins', rarity: 'common' },
  ],
  powerups: [
    { id: 'p1', name: 'Double XP', icon: 'trending-up', iconColor: '#FDCB6E', price: 200, currency: 'coins', rarity: 'common', isFeatured: true },
    { id: 'p2', name: 'Time Freeze', icon: 'time', iconColor: '#74B9FF', price: 350, currency: 'coins', rarity: 'rare' },
    { id: 'p3', name: 'Mind Read', icon: 'eye', iconColor: '#A29BFE', price: 25, currency: 'gems', rarity: 'epic' },
    { id: 'p4', name: 'Shield Wall', icon: 'shield-checkmark', iconColor: '#00B894', price: 150, currency: 'coins', rarity: 'common' },
    { id: 'p5', name: 'Vote Reveal', icon: 'scan', iconColor: '#FD79A8', price: 40, currency: 'gems', rarity: 'rare' },
    { id: 'p6', name: 'Crowd Surge', icon: 'people', iconColor: '#FF7675', price: 500, currency: 'coins', rarity: 'epic' },
  ],
};

const RARITY_COLORS: Record<string, string> = {
  common: colors.textSecondary,
  rare: colors.info,
  epic: colors.primary,
  legendary: colors.gold,
};

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const ShopScreen: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<ShopTab>('avatars');
  const [items, setItems] = useState<Record<ShopTab, ShopItem[]>>(SHOP_ITEMS);
  const [coinBalance, setCoinBalance] = useState(0);
  const [gemBalance, setGemBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const fetchBalance = async () => {
    try {
      const balance = await paymentService.getBalance();
      setCoinBalance(balance.coins);
      if ('gems' in balance && typeof (balance as any).gems === 'number') {
        setGemBalance((balance as any).gems);
      }
    } catch (error) {
      console.warn('Failed to fetch balance, using defaults');
    }
  };

  const fetchProducts = async () => {
    try {
      const products = await paymentService.getProducts();
      if (products && products.length > 0) {
        const mapped: Record<ShopTab, ShopItem[]> = {
          avatars: [],
          themes: [],
          powerups: [],
        };
        products.forEach((product) => {
          const tab = (product.category as ShopTab) || 'powerups';
          if (mapped[tab]) {
            mapped[tab].push({
              id: product.id,
              name: product.name,
              icon: 'cube-outline',
              iconColor: colors.primary,
              price: product.coins,
              currency: 'coins',
            });
          }
        });
        const hasItems = Object.values(mapped).some((arr) => arr.length > 0);
        if (hasItems) {
          setItems(mapped);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch products, using default items');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchBalance()]);
      setLoading(false);
    };
    initialize();
  }, []);

  const handlePurchase = (item: ShopItem) => {
    if (item.isOwned) return;

    Alert.alert(
      'Confirm Purchase',
      `Buy "${item.name}" for ${item.price} ${item.currency}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            try {
              setPurchasing(true);
              await paymentService.purchase(item.id, item.price);
              await fetchBalance();
              Alert.alert('Success', `You purchased ${item.name}!`);
            } catch (error: any) {
              Alert.alert('Purchase Failed', error?.message || 'Something went wrong. Please try again.');
            } finally {
              setPurchasing(false);
            }
          },
        },
      ],
    );
  };

  const currentItems = items[selectedTab];
  const featuredItems = currentItems.filter((item) => item.isFeatured);

  const renderBalanceHeader = () => (
    <View style={styles.balanceRow}>
      <TouchableOpacity style={styles.balanceItem}>
        <Ionicons name="logo-bitcoin" size={18} color={colors.gold} />
        <Text style={styles.balanceText}>{coinBalance.toLocaleString()}</Text>
        <View style={styles.addButton}>
          <Ionicons name="add" size={14} color={colors.text} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.balanceItem}>
        <Ionicons name="diamond" size={16} color={colors.secondary} />
        <Text style={styles.balanceText}>{gemBalance}</Text>
        <View style={styles.addButton}>
          <Ionicons name="add" size={14} color={colors.text} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPremiumBanner = () => (
    <TouchableOpacity style={styles.premiumBanner} activeOpacity={0.8}>
      <View style={styles.premiumLeft}>
        <View style={styles.premiumBadge}>
          <Ionicons name="diamond" size={12} color={colors.background} />
          <Text style={styles.premiumBadgeText}>PREMIUM</Text>
        </View>
        <Text style={styles.premiumTitle}>Crowd Mind Pro</Text>
        <Text style={styles.premiumDesc}>Unlock exclusive items, 2x XP, and ad-free gameplay</Text>
      </View>
      <View style={styles.premiumRight}>
        <Ionicons name="arrow-forward-circle" size={32} color={colors.gold} />
      </View>
    </TouchableOpacity>
  );

  const renderTabSelector = () => (
    <View style={styles.tabContainer}>
      {SHOP_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
          onPress={() => setSelectedTab(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={18}
            color={selectedTab === tab.key ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFeaturedSection = () => {
    if (featuredItems.length === 0) return null;

    return (
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={18} color={colors.gold} />
          <Text style={styles.sectionTitle}>Featured</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.featuredCard} activeOpacity={0.7}>
              <View style={[styles.featuredIconContainer, { backgroundColor: item.iconColor + '20' }]}>
                <Ionicons name={item.icon} size={36} color={item.iconColor} />
              </View>
              <Text style={styles.featuredName}>{item.name}</Text>
              <View style={[styles.rarityBadge, { backgroundColor: (RARITY_COLORS[item.rarity || 'common']) + '20' }]}>
                <Text style={[styles.rarityText, { color: RARITY_COLORS[item.rarity || 'common'] }]}>
                  {(item.rarity || 'common').toUpperCase()}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Ionicons
                  name={item.currency === 'coins' ? 'logo-bitcoin' : 'diamond'}
                  size={14}
                  color={item.currency === 'coins' ? colors.gold : colors.secondary}
                />
                <Text style={styles.priceText}>{item.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderShopItem = ({ item }: { item: ShopItem }) => {
    const rarityColor = RARITY_COLORS[item.rarity || 'common'];

    return (
      <TouchableOpacity
        style={[styles.itemCard, item.isOwned && styles.itemCardOwned]}
        activeOpacity={0.7}
      >
        <View style={[styles.itemIconContainer, { backgroundColor: item.iconColor + '15' }]}>
          <Ionicons name={item.icon} size={32} color={item.iconColor} />
        </View>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '20' }]}>
          <Text style={[styles.rarityText, { color: rarityColor }]}>
            {(item.rarity || 'common').toUpperCase()}
          </Text>
        </View>
        {item.isOwned ? (
          <View style={styles.ownedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.ownedText}>Owned</Text>
          </View>
        ) : (
          <View style={styles.priceRow}>
            <Ionicons
              name={item.currency === 'coins' ? 'logo-bitcoin' : 'diamond'}
              size={14}
              color={item.currency === 'coins' ? colors.gold : colors.secondary}
            />
            <Text style={styles.priceText}>{item.price}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop</Text>
        {renderBalanceHeader()}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Banner */}
        {renderPremiumBanner()}

        {/* Tab Selector */}
        {renderTabSelector()}

        {/* Featured */}
        {renderFeaturedSection()}

        {/* All Items Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All {SHOP_TABS.find((t) => t.key === selectedTab)?.label}</Text>
        </View>
        <View style={styles.gridContainer}>
          {currentItems.map((item) => (
            <View key={item.id} style={styles.gridItem}>
              {renderShopItem({ item })}
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  addButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  // Premium Banner
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold + '30',
    ...shadows.md,
  },
  premiumLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  premiumBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
    color: colors.background,
    letterSpacing: 1,
  },
  premiumTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  premiumDesc: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  premiumRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: typography.weight.bold,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  // Featured Section
  featuredSection: {
    marginBottom: spacing.lg,
  },
  featuredCard: {
    width: 150,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  featuredIconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featuredName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  // Rarity Badge
  rarityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  rarityText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: ITEM_WIDTH,
    marginBottom: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  itemCardOwned: {
    borderColor: colors.success + '40',
    opacity: 0.8,
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  // Owned Badge
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ownedText: {
    fontSize: typography.size.sm,
    color: colors.success,
    fontWeight: typography.weight.medium,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});

export default ShopScreen;
