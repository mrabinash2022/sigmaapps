import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

export default function AddressPicker({ visible, addresses, selectedId, onSelect, onClose, onManage }) {
  const rows = useMemo(() => addresses || [], [addresses]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Delivery address</Text>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>No saved addresses. Add one in Profile.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, selectedId === item.id && styles.rowSelected]}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.label}>{item.label}{item.isDefault ? ' (default)' : ''}</Text>
                <Text style={styles.address}>{item.address}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.btnOutline} onPress={onManage}>
            <Text style={styles.btnOutlineText}>Manage addresses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 8 },
  rowSelected: { borderColor: '#1a7f4b', backgroundColor: '#f0fdf4' },
  label: { fontWeight: '700', marginBottom: 4 },
  address: { color: '#555', lineHeight: 20 },
  empty: { color: '#888', marginBottom: 12 },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1a7f4b', marginTop: 8 },
  btnOutlineText: { color: '#1a7f4b', fontWeight: '700' },
});
