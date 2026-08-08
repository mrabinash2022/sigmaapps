import { Linking, Platform, Alert } from 'react-native';
import { buildMapsDirectionsUrl } from '@localite/shared';

export function openDirections({ latitude, longitude, address, label }) {
  const url = buildMapsDirectionsUrl({
    destinationLat: latitude,
    destinationLon: longitude,
    destinationAddress: address,
  });
  if (!url) {
    Alert.alert('No location', 'Delivery address is not available for directions.');
    return;
  }
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open maps', Platform.OS === 'ios' ? 'Install Apple Maps or Google Maps.' : 'Install Google Maps.');
  });
}
