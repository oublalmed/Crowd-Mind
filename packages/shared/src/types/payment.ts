import { UUID } from './common';

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'grace_period' | 'past_due';
export type PaymentProvider = 'stripe' | 'google_play' | 'apple_iap';
export type TransactionType = 'subscription' | 'tournament_entry' | 'one_time_purchase';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Subscription {
  id: UUID;
  userId: UUID;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
}

export interface Transaction {
  id: UUID;
  userId: UUID;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerTransactionId: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays: number;
  features: SubscriptionFeature[];
}

export interface SubscriptionFeature {
  name: string;
  freeValue: string;
  premiumValue: string;
}

export interface Tournament {
  id: UUID;
  name: string;
  entryFee: number;
  currency: string;
  prizePool: number;
  maxParticipants: number;
  currentParticipants: number;
  startsAt: string;
  endsAt: string;
  status: 'upcoming' | 'active' | 'completed';
  requiresPremium: boolean;
}

export const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  { name: 'Ads', freeValue: 'Yes', premiumValue: 'No' },
  { name: 'Daily games', freeValue: '5', premiumValue: 'Unlimited' },
  { name: 'Tournaments', freeValue: 'View only', premiumValue: 'Full access' },
  { name: 'Exclusive skins', freeValue: 'No', premiumValue: 'Yes' },
  { name: 'Stats dashboard', freeValue: 'Basic', premiumValue: 'Advanced' },
];
