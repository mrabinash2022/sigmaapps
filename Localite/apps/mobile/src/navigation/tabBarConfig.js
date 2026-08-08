import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export function TabLabel({ label, focused, colors }) {
  return (
    <Text style={[
      styles.tabLabel,
      focused ? [styles.tabLabelActive, { color: colors.brand }] : [styles.tabLabelInactive, { color: colors.tabInactive }],
    ]}
    >
      {label}
    </Text>
  );
}

export function AppTabIcon({ name, focused, colors }) {
  return (
    <View style={[styles.tabIconWrap, focused && { backgroundColor: colors.accentSurface }]}>
      <Ionicons
        name={name}
        size={focused ? 24 : 22}
        color={focused ? colors.brand : colors.tabInactive}
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

export function buildTabOptions({ label, title, iconActive, iconInactive, testID, colors }) {
  return {
    title,
    tabBarTestID: testID,
    tabBarLabel: ({ focused }) => <TabLabel label={label} focused={focused} colors={colors} />,
    tabBarIcon: ({ focused }) => (
      <AppTabIcon name={focused ? iconActive : iconInactive} focused={focused} colors={colors} />
    ),
    tabBarButton: (props) => <AppTabBarButton {...props} testID={testID} />,
  };
}

export function getAppTabScreenOptions(colors, { bottomInset = 0 } = {}) {
  const bottomPad = Platform.OS === 'android'
    ? Math.max(bottomInset, 10) + 8
    : Math.max(bottomInset, 20);
  const tabBarHeight = (Platform.OS === 'ios' ? 49 : 56) + bottomPad;

  return {
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.tabInactive,
    tabBarShowLabel: true,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      backgroundColor: colors.tabBar,
      borderTopWidth: 1,
      borderTopColor: colors.tabBarBorder,
      height: tabBarHeight,
      paddingTop: 8,
      paddingBottom: bottomPad,
      elevation: 16,
      shadowColor: '#000000',
      shadowOpacity: colors.mode === 'dark' ? 0.35 : 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
    },
    tabBarItemStyle: styles.tabBarItem,
    tabBarButton: (props) => <AppTabBarButton {...props} />,
  };
}

export function useAppTabScreenOptions(colors) {
  const insets = useSafeAreaInsets();
  return React.useMemo(
    () => getAppTabScreenOptions(colors, { bottomInset: insets.bottom }),
    [colors, insets.bottom],
  );
}

const styles = StyleSheet.create({
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
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  tabLabelInactive: {
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
    fontSize: 12.5,
  },
  tabButtonPressed: {
    opacity: 0.75,
  },
});
