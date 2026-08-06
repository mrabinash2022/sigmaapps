import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProfileBar from './ProfileBar';

export default function ScreenLayout({ children, style }) {
  return (
    <View style={[styles.container, style]}>
      <ProfileBar />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
});
