import React from 'react';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { UserRole } from '@localite/shared';
import { getNavigationTheme } from './src/theme/colors';
import SplashScreen from './src/components/SplashScreen';

import LoginScreen from './src/screens/LoginScreen';
import CustomerOnboardingScreen from './src/screens/onboarding/CustomerOnboardingScreen';
import AdminOnboardingScreen from './src/screens/onboarding/AdminOnboardingScreen';
import ShopListScreen from './src/screens/customer/ShopListScreen';
import CatalogOrderScreen from './src/screens/customer/CatalogOrderScreen';
import PlaceOrderScreen from './src/screens/customer/PlaceOrderScreen';
import MyOrdersScreen from './src/screens/customer/MyOrdersScreen';
import MyTicketsScreen from './src/screens/customer/MyTicketsScreen';
import OrderDetailScreen from './src/screens/customer/OrderDetailScreen';
import ReorderConfirmScreen from './src/screens/customer/ReorderConfirmScreen';
import WishlistScreen from './src/screens/customer/WishlistScreen';
import ShopInboxScreen from './src/screens/shopkeeper/ShopInboxScreen';
import SupportInboxScreen from './src/screens/shopkeeper/SupportInboxScreen';
import CompleteInvitationScreen from './src/screens/shopkeeper/CompleteInvitationScreen';
import ManageOrderScreen from './src/screens/shopkeeper/ManageOrderScreen';
import ManageShopProfileScreen from './src/screens/shopkeeper/ManageShopProfileScreen';
import StaffManagementScreen from './src/screens/shopkeeper/StaffManagementScreen';
import ManageCatalogScreen from './src/screens/shopkeeper/ManageCatalogScreen';
import EditCatalogItemScreen from './src/screens/shopkeeper/EditCatalogItemScreen';
import SuperAdminDashboard from './src/screens/admin/SuperAdminDashboard';
import PlatformAnalyticsScreen from './src/screens/admin/PlatformAnalyticsScreen';
import CustomerHomeScreen from './src/screens/home/CustomerHomeScreen';
import ShopkeeperHomeScreen from './src/screens/home/ShopkeeperHomeScreen';
import SuperAdminHomeScreen from './src/screens/home/SuperAdminHomeScreen';
import ManageOffersScreen from './src/screens/home/ManageOffersScreen';
import ManageStoreInfoScreen from './src/screens/home/ManageStoreInfoScreen';
import ManageAnnouncementsScreen from './src/screens/home/ManageAnnouncementsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import SavedAddressesScreen from './src/screens/profile/SavedAddressesScreen';
import ProfileOrdersScreen from './src/screens/profile/ProfileOrdersScreen';
import ReportsScreen from './src/screens/profile/ReportsScreen';
import {
  buildTabOptions,
  useAppTabScreenOptions,
} from './src/navigation/tabBarConfig';
import { shopHasBulkBuyEnabled } from './src/utils/profile';
import BulkBuyHomeScreen from './src/bulk-buy/screens/BulkBuyHomeScreen';
import CreateCampaignScreen from './src/bulk-buy/screens/CreateCampaignScreen';
import CampaignDetailScreen from './src/bulk-buy/screens/CampaignDetailScreen';
import SubmitOfferScreen from './src/bulk-buy/screens/SubmitOfferScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const bulkBuyStackScreens = (
  <>
    <Stack.Screen name="BulkBuyCreateCampaign" component={CreateCampaignScreen} options={{ title: 'Start campaign' }} />
    <Stack.Screen name="BulkBuyEditCampaign" component={CreateCampaignScreen} options={{ title: 'Edit campaign' }} />
    <Stack.Screen name="BulkBuyCampaignDetail" component={CampaignDetailScreen} options={{ title: 'Campaign' }} />
    <Stack.Screen
      name="BulkBuySubmitOffer"
      component={SubmitOfferScreen}
      options={({ route }) => ({ title: route.params?.offer ? 'Edit offer' : 'Submit offer' })}
    />
  </>
);

const navigationRef = React.createRef();

function navigateFromNotification(data) {
  const orderId = data?.orderId;
  const screen = data?.screen || 'OrderDetail';
  if (!orderId || !navigationRef.current?.isReady?.()) return;
  navigationRef.current.navigate(screen, { orderId });
}

function useHeaderOptions() {
  const { colors } = useTheme();
  return React.useMemo(() => ({
    headerStyle: { backgroundColor: colors.headerBg },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: '700' },
    contentStyle: { backgroundColor: colors.background },
  }), [colors]);
}

function LogoutButton() {
  const { logout } = useAuth();
  const { colors } = useTheme();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Pressable
      onPress={handleLogout}
      disabled={loggingOut}
      hitSlop={12}
      style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
    >
      {loggingOut ? (
        <ActivityIndicator size="small" color={colors.headerText} />
      ) : (
        <Text style={[styles.logoutText, { color: colors.headerText }]}>Logout</Text>
      )}
    </Pressable>
  );
}

function AppShell() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigationTheme = React.useMemo(() => getNavigationTheme(colors), [colors]);
  const showLightStatusBar = Boolean(user);

  React.useEffect(() => {
    if (!user) return undefined;

    const handleResponse = (response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.orderId) navigateFromNotification(data);
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => { if (response) handleResponse(response); })
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [user?.id]);

  return (
    <NavigationContainer
      ref={navigationRef}
      key={`${user?.id ?? 'guest'}-${colors.accent}`}
      theme={navigationTheme}
    >
      <StatusBar style={showLightStatusBar ? 'light' : (colors.mode === 'dark' ? 'light' : 'dark')} />
      <AppNavigator />
    </NavigationContainer>
  );
}

function CustomerTabs() {
  const { colors } = useTheme();
  const headerOptions = useHeaderOptions();
  const baseTabOptions = useAppTabScreenOptions(colors);
  const tabScreenOptions = React.useMemo(
    () => ({
      ...baseTabOptions,
      ...headerOptions,
      headerRight: () => <LogoutButton />,
    }),
    [baseTabOptions, headerOptions],
  );

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={CustomerHomeScreen}
        options={buildTabOptions({
          label: 'Home',
          title: 'Home',
          iconActive: 'home',
          iconInactive: 'home-outline',
          testID: 'tab-home',
          colors,
        })}
      />
      <Tab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={buildTabOptions({
          label: 'Orders',
          title: 'Orders',
          iconActive: 'receipt',
          iconInactive: 'receipt-outline',
          testID: 'tab-orders',
          colors,
        })}
      />
      <Tab.Screen
        name="Shops"
        component={ShopListScreen}
        options={buildTabOptions({
          label: 'Stores',
          title: 'Stores',
          iconActive: 'storefront',
          iconInactive: 'storefront-outline',
          testID: 'tab-stores',
          colors,
        })}
      />
      <Tab.Screen
        name="BulkBuy"
        component={BulkBuyHomeScreen}
        options={buildTabOptions({
          label: 'Bulk Buy',
          title: 'Bulk Buy',
          iconActive: 'people',
          iconInactive: 'people-outline',
          testID: 'tab-bulk-buy',
          colors,
        })}
      />
    </Tab.Navigator>
  );
}

function CustomerStack() {
  const headerOptions = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Home" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CatalogOrder" component={CatalogOrderScreen} options={{ title: 'Browse & Order' }} />
      <Stack.Screen name="PlaceOrder" component={PlaceOrderScreen} options={{ title: 'Place Order' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
      <Stack.Screen name="MyTickets" component={MyTicketsScreen} options={{ title: 'Support tickets' }} />
      <Stack.Screen name="ReorderConfirm" component={ReorderConfirmScreen} options={{ title: 'Reorder' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
      <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} options={{ title: 'Saved addresses' }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: 'Saved items' }} />
      <Stack.Screen name="ProfileOrders" component={ProfileOrdersScreen} options={{ title: 'Order History' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="ManageOffers" component={ManageOffersScreen} options={{ title: 'Offers & discounts' }} />
      <Stack.Screen name="ManageStoreInfo" component={ManageStoreInfoScreen} options={{ title: 'Store info' }} />
      {bulkBuyStackScreens}
    </Stack.Navigator>
  );
}

function AdminTabs() {
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const shopBulkBuyEnabled = shopHasBulkBuyEnabled(user);
  const headerOptions = useHeaderOptions();
  const baseTabOptions = useAppTabScreenOptions(colors);
  const tabScreenOptions = React.useMemo(
    () => ({
      ...baseTabOptions,
      ...headerOptions,
      headerRight: () => <LogoutButton />,
    }),
    [baseTabOptions, headerOptions],
  );

  useFocusEffect(
    React.useCallback(() => {
      refreshUser().catch(() => {});
    }, [refreshUser]),
  );

  return (
    <Tab.Navigator key={shopBulkBuyEnabled ? 'admin-bulk-on' : 'admin-bulk-off'} screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={ShopkeeperHomeScreen}
        options={buildTabOptions({
          label: 'Home',
          title: 'Home',
          iconActive: 'home',
          iconInactive: 'home-outline',
          testID: 'tab-home',
          colors,
        })}
      />
      <Tab.Screen
        name="Inbox"
        component={ShopInboxScreen}
        options={buildTabOptions({
          label: 'Orders',
          title: 'Order Queue',
          iconActive: 'receipt',
          iconInactive: 'receipt-outline',
          testID: 'tab-orders',
          colors,
        })}
      />
      <Tab.Screen
        name="Products"
        component={ManageCatalogScreen}
        options={buildTabOptions({
          label: 'Products',
          title: 'Products',
          iconActive: 'grid',
          iconInactive: 'grid-outline',
          colors,
        })}
      />
      <Tab.Screen
        name="Support"
        component={SupportInboxScreen}
        options={buildTabOptions({
          label: 'Support',
          title: 'Support',
          iconActive: 'chatbubbles',
          iconInactive: 'chatbubbles-outline',
          colors,
        })}
      />
      {shopBulkBuyEnabled && (
        <Tab.Screen
          name="BulkBuy"
          component={BulkBuyHomeScreen}
          options={buildTabOptions({
            label: 'Bulk Buy',
            title: 'Bulk Buy',
            iconActive: 'people',
            iconInactive: 'people-outline',
            testID: 'tab-bulk-buy',
            colors,
          })}
        />
      )}
    </Tab.Navigator>
  );
}

function AdminStack() {
  const headerOptions = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="Home" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CompleteInvitation" component={CompleteInvitationScreen} options={{ title: 'Register Shop' }} />
      <Stack.Screen name="ManageOrder" component={ManageOrderScreen} options={{ title: 'Manage Order' }} />
      <Stack.Screen name="SupportInbox" component={SupportInboxScreen} options={{ title: 'Support inbox' }} />
      <Stack.Screen name="EditCatalogItem" component={EditCatalogItemScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Shop Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
      <Stack.Screen name="ManageShopProfile" component={ManageShopProfileScreen} options={{ title: 'Shop profile' }} />
      <Stack.Screen name="StaffManagement" component={StaffManagementScreen} options={{ title: 'Staff' }} />
      <Stack.Screen name="ProfileOrders" component={ProfileOrdersScreen} options={{ title: 'Orders Served' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="ManageOffers" component={ManageOffersScreen} options={{ title: 'Offers & discounts' }} />
      <Stack.Screen name="ManageStoreInfo" component={ManageStoreInfoScreen} options={{ title: 'Store info' }} />
      {bulkBuyStackScreens}
    </Stack.Navigator>
  );
}

function SuperAdminTabs() {
  const { colors } = useTheme();
  const headerOptions = useHeaderOptions();
  const baseTabOptions = useAppTabScreenOptions(colors);
  const tabScreenOptions = React.useMemo(
    () => ({
      ...baseTabOptions,
      ...headerOptions,
      headerRight: () => <LogoutButton />,
    }),
    [baseTabOptions, headerOptions],
  );

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={SuperAdminHomeScreen}
        options={buildTabOptions({
          label: 'Home',
          title: 'Home',
          iconActive: 'home',
          iconInactive: 'home-outline',
          testID: 'tab-home',
          colors,
        })}
      />
      <Tab.Screen
        name="Dashboard"
        component={SuperAdminDashboard}
        options={buildTabOptions({
          label: 'Admin',
          title: 'Super Admin',
          iconActive: 'shield',
          iconInactive: 'shield-outline',
          colors,
        })}
      />
      <Tab.Screen
        name="BulkBuy"
        component={BulkBuyHomeScreen}
        options={buildTabOptions({
          label: 'Bulk Buy',
          title: 'Bulk Buy',
          iconActive: 'people',
          iconInactive: 'people-outline',
          testID: 'tab-bulk-buy',
          colors,
        })}
      />
    </Tab.Navigator>
  );
}

function SuperAdminStack() {
  const headerOptions = useHeaderOptions();
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="Home" component={SuperAdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="PlatformAnalytics" component={PlatformAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="ProfileOrders" component={ProfileOrdersScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen
        name="ManageOffers"
        component={ManageOffersScreen}
        initialParams={{ platform: true }}
        options={{ title: 'Platform offers' }}
      />
      <Stack.Screen
        name="ManageAnnouncements"
        component={ManageAnnouncementsScreen}
        options={{ title: 'Announcements' }}
      />
      {bulkBuyStackScreens}
    </Stack.Navigator>
  );
}

function OnboardingRouter() {
  const { user } = useAuth();
  if (user.role === UserRole.CUSTOMER) return <CustomerOnboardingScreen />;
  if (user.role === UserRole.ADMIN) return <AdminOnboardingScreen />;
  return null;
}

function AppNavigator() {
  const { user, loading, needsOnboarding, isSuperAdmin, isAdmin, isCustomer } = useAuth();
  const [splashDone, setSplashDone] = React.useState(false);
  const splashStartedAt = React.useRef(Date.now());

  React.useEffect(() => {
    if (loading) {
      setSplashDone(false);
      splashStartedAt.current = Date.now();
      return undefined;
    }
    const minMs = 1400;
    const elapsed = Date.now() - splashStartedAt.current;
    const timer = setTimeout(() => setSplashDone(true), Math.max(0, minMs - elapsed));
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading || !splashDone) {
    return <SplashScreen />;
  }

  if (!user) return <LoginScreen />;
  if (needsOnboarding) return <OnboardingRouter />;
  if (isSuperAdmin) return <SuperAdminStack />;
  if (isAdmin) return <AdminStack />;
  if (isCustomer) return <CustomerStack />;

  return <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  logout: { marginRight: 16, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
  logoutPressed: { opacity: 0.7 },
  logoutText: { fontSize: 13, fontWeight: '600' },
});
