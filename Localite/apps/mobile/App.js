import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Pressable, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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

function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#1a7f4b', ...headerOptions, headerRight: () => <LogoutButton /> }}>
      <Tab.Screen name="Shops" component={ShopListScreen} options={{ title: 'Stores', tabBarLabel: 'Stores' }} />
      <Tab.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'Orders', tabBarLabel: 'Orders' }} />
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
});
