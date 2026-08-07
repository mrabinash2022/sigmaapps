import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TAB_ACTIVE = '#1a7f4b';
export const TAB_INACTIVE = '#94a3b8';

export function TabLabel({ label, focused }) {
  return (
    <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}>
      {label}
    </Text>
  );
}

export function AppTabIcon({ name, focused }) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Ionicons
        name={name}
        size={focused ? 24 : 22}
        color={focused ? TAB_ACTIVE : TAB_INACTIVE}
      />
    </View>
  );
}

export function AppTabBarButton(props) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [props.style, pressed && styles.tabButtonPressed]}
    />
  );
}

export function buildTabOptions({ label, title, iconActive, iconInactive }) {
  return {
    title,
    tabBarLabel: ({ focused }) => <TabLabel label={label} focused={focused} />,
    tabBarIcon: ({ focused }) => (
      <AppTabIcon name={focused ? iconActive : iconInactive} focused={focused} />
    ),
  };
}

const styles = StyleSheet.create({
  appTabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2efe6',
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    elevation: 16,
    shadowColor: '#14532d',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
  },
  tabBarItem: {
    paddingTop: 2,
  },
  tabIconWrap: {
    width: 44,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#e8f5ee',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  tabLabelInactive: {
    fontWeight: '600',
    color: TAB_INACTIVE,
  },
  tabLabelActive: {
    fontWeight: '800',
    fontSize: 12.5,
    color: TAB_ACTIVE,
  },
  tabButtonPressed: {
    opacity: 0.75,
  },
});

export const appTabScreenOptions = {
  tabBarActiveTintColor: TAB_ACTIVE,
  tabBarInactiveTintColor: TAB_INACTIVE,
  tabBarShowLabel: true,
  tabBarHideOnKeyboard: true,
  tabBarStyle: styles.appTabBar,
  tabBarItemStyle: styles.tabBarItem,
  tabBarButton: (props) => <AppTabBarButton {...props} />,
};
