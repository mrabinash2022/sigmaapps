import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UserRole } from '@localite/shared';

import LoginScreen from './src/screens/LoginScreen';
import CustomerOnboardingScreen from './src/screens/onboarding/CustomerOnboardingScreen';
import AdminOnboardingScreen from './src/screens/onboarding/AdminOnboardingScreen';
import ShopListScreen from './src/screens/customer/ShopListScreen';
import CatalogOrderScreen from './src/screens/customer/CatalogOrderScreen';
import PlaceOrderScreen from './src/screens/customer/PlaceOrderScreen';
import MyOrdersScreen from './src/screens/customer/MyOrdersScreen';
import OrderDetailScreen from './src/screens/customer/OrderDetailScreen';
import ReorderConfirmScreen from './src/screens/customer/ReorderConfirmScreen';
import ShopInboxScreen from './src/screens/shopkeeper/ShopInboxScreen';
import CompleteInvitationScreen from './src/screens/shopkeeper/CompleteInvitationScreen';
import ManageOrderScreen from './src/screens/shopkeeper/ManageOrderScreen';
import ManageCatalogScreen from './src/screens/shopkeeper/ManageCatalogScreen';
import EditCatalogItemScreen from './src/screens/shopkeeper/EditCatalogItemScreen';
import SuperAdminDashboard from './src/screens/admin/SuperAdminDashboard';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import ProfileOrdersScreen from './src/screens/profile/ProfileOrdersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: '#1a7f4b' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

function LogoutButton() {
  const { logout } = useAuth();
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
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.logoutText}>Logout</Text>
      )}
    </Pressable>
  );
}

function AppShell() {
  const { user } = useAuth();

  return (
    <NavigationContainer key={user?.id ?? 'guest'}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}

const TAB_ACTIVE = '#1a7f4b';
const TAB_INACTIVE = '#94a3b8';

function TabLabel({ label, focused, color }) {
  return (
    <Text style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]}>
      {label}
    </Text>
  );
}

function CustomerTabIcon({ name, focused, color }) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.customerTabBar,
        headerStyle: headerOptions.headerStyle,
        headerTintColor: headerOptions.headerTintColor,
        headerTitleStyle: headerOptions.headerTitleStyle,
        headerRight: () => <LogoutButton />,
      }}
    >
      <Tab.Screen
        name="Shops"
        component={ShopListScreen}
        options={{
          title: 'Stores',
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Stores" focused={focused} color={color} />
          ),
          tabBarIcon: ({ focused, color }) => (
            <CustomerTabIcon
              name={focused ? 'storefront' : 'storefront-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{
          title: 'Orders',
          tabBarLabel: ({ focused, color }) => (
            <TabLabel label="Orders" focused={focused} color={color} />
          ),
          tabBarIcon: ({ focused, color }) => (
            <CustomerTabIcon
              name={focused ? 'receipt' : 'receipt-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Home" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CatalogOrder" component={CatalogOrderScreen} options={{ title: 'Browse & Order' }} />
      <Stack.Screen name="PlaceOrder" component={PlaceOrderScreen} options={{ title: 'Place Order' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
      <Stack.Screen name="ReorderConfirm" component={ReorderConfirmScreen} options={{ title: 'Reorder' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="ProfileOrders" component={ProfileOrdersScreen} options={{ title: 'Order History' }} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#1a7f4b', ...headerOptions, headerRight: () => <LogoutButton /> }}>
      <Tab.Screen name="Inbox" component={ShopInboxScreen} options={{ title: 'Order Queue', tabBarLabel: 'Orders' }} />
      <Tab.Screen name="Products" component={ManageCatalogScreen} options={{ title: 'Products', tabBarLabel: 'Products' }} />
    </Tab.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="Home" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CompleteInvitation" component={CompleteInvitationScreen} options={{ title: 'Register Shop' }} />
      <Stack.Screen name="ManageOrder" component={ManageOrderScreen} options={{ title: 'Manage Order' }} />
      <Stack.Screen name="EditCatalogItem" component={EditCatalogItemScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Shop Profile' }} />
      <Stack.Screen name="ProfileOrders" component={ProfileOrdersScreen} options={{ title: 'Orders Served' }} />
    </Stack.Navigator>
  );
}

function SuperAdminStack() {
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen name="Dashboard" component={SuperAdminDashboard} options={{ title: 'Super Admin' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="ProfileOrders" component={ProfileOrdersScreen} options={{ title: 'Orders' }} />
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a7f4b" />
      </View>
    );
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
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logout: { marginRight: 16, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
  logoutPressed: { opacity: 0.7 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  customerTabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2efe6',
    height: Platform.OS === 'ios' ? 84 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    elevation: 16,
    shadowColor: '#14532d',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#e8f5ee',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '800',
    fontSize: 12.5,
  },
});
