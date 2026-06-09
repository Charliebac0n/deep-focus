import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const ENTITLEMENT_ID = 'premium';
const SEEN_PAYWALL_KEY = '@deep_seen_paywall_v1';

// Annual plan carries the 7-day free trial (configure in App Store Connect)
export const ANNUAL_PRODUCT_ID = 'deep_premium_yearly';
export const MONTHLY_PRODUCT_ID = 'deep_premium_monthly';

interface PremiumContextType {
  isPremium: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  customerInfo: CustomerInfo | null;
  offering: PurchasesOffering | null;
  paywallVisible: boolean;
  purchasing: boolean;
  restoring: boolean;
  showPaywall: () => void;
  dismissPaywall: () => void;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  startTrial: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  isTrialActive: false,
  trialDaysLeft: 0,
  customerInfo: null,
  offering: null,
  paywallVisible: false,
  purchasing: false,
  restoring: false,
  showPaywall: () => {},
  dismissPaywall: () => {},
  purchasePackage: async () => {},
  startTrial: async () => {},
  restorePurchases: async () => {},
});

function deriveTrialState(info: CustomerInfo): { isTrialActive: boolean; trialDaysLeft: number } {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  if (!entitlement) return { isTrialActive: false, trialDaysLeft: 0 };

  const isTrialActive = entitlement.periodType === 'TRIAL';
  let trialDaysLeft = 0;
  if (isTrialActive && entitlement.expirationDate) {
    const msLeft = new Date(entitlement.expirationDate).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  }
  return { isTrialActive, trialDaysLeft };
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const apiKey = Constants.expoConfig?.extra?.rcApiKeyIos as string | undefined;
    if (!apiKey || apiKey.startsWith('appl_XXX')) {
      // RevenueCat not configured yet — skip initialisation in dev
      AsyncStorage.getItem(SEEN_PAYWALL_KEY).then(seen => {
        if (!seen) setPaywallVisible(true);
      });
      return;
    }

    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });

    Purchases.addCustomerInfoUpdateListener(setCustomerInfo);

    Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]).then(([info, offerings]) => {
      setCustomerInfo(info);
      setOffering(offerings.current);
    }).catch(() => {});

    AsyncStorage.getItem(SEEN_PAYWALL_KEY).then(seen => {
      if (!seen) setPaywallVisible(true);
    });

    return () => {
      Purchases.removeCustomerInfoUpdateListener(setCustomerInfo);
    };
  }, []);

  const isPremium = Boolean(customerInfo?.entitlements.active[ENTITLEMENT_ID]);
  const { isTrialActive, trialDaysLeft } = customerInfo
    ? deriveTrialState(customerInfo)
    : { isTrialActive: false, trialDaysLeft: 0 };

  const dismissPaywall = useCallback(() => {
    AsyncStorage.setItem(SEEN_PAYWALL_KEY, 'true').catch(() => {});
    setPaywallVisible(false);
  }, []);

  const showPaywall = useCallback(() => setPaywallVisible(true), []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const { customerInfo: updated } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(updated);
      AsyncStorage.setItem(SEEN_PAYWALL_KEY, 'true').catch(() => {});
      setPaywallVisible(false);
    } finally {
      setPurchasing(false);
    }
  }, []);

  // Convenience: purchase the annual package (which carries the free trial)
  const startTrial = useCallback(async () => {
    if (!offering) return;
    const annualPkg = offering.annual ?? offering.availablePackages[0];
    if (!annualPkg) return;
    await purchasePackage(annualPkg);
  }, [offering, purchasePackage]);

  const restorePurchases = useCallback(async () => {
    setRestoring(true);
    try {
      const updated = await Purchases.restorePurchases();
      setCustomerInfo(updated);
      if (updated.entitlements.active[ENTITLEMENT_ID]) {
        setPaywallVisible(false);
      }
    } finally {
      setRestoring(false);
    }
  }, []);

  return (
    <PremiumContext.Provider value={{
      isPremium,
      isTrialActive,
      trialDaysLeft,
      customerInfo,
      offering,
      paywallVisible,
      purchasing,
      restoring,
      showPaywall,
      dismissPaywall,
      purchasePackage,
      startTrial,
      restorePurchases,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => useContext(PremiumContext);
