import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { TicketIssueType } from '@localite/shared';
import { api } from '../services/api';

const ISSUE_LABELS = {
  [TicketIssueType.DELIVERY_INSTRUCTION]: 'Delivery instruction',
  [TicketIssueType.WRONG_ITEM]: 'Wrong item',
  [TicketIssueType.DAMAGED_PRODUCT]: 'Damaged product',
  [TicketIssueType.DELAYED_DELIVERY]: 'Delayed delivery',
  [TicketIssueType.OTHER]: 'Other issue',
};

export function OrderSupportButton({ orderId, compact = false }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.helpBtn, compact && styles.helpBtnCompact]}
        onPress={() => setVisible(true)}
        hitSlop={8}
      >
        <Text style={styles.helpIcon}>?</Text>
        {!compact && <Text style={styles.helpLabel}>Support</Text>}
      </TouchableOpacity>

      <OrderSupportModal
        orderId={orderId}
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

export function OrderSupportModal({ orderId, visible, onClose }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issueType, setIssueType] = useState(TicketIssueType.OTHER);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [activeTicketId, setActiveTicketId] = useState(null);

  const loadTickets = useCallback(() => {
    if (!orderId) return;
    setLoading(true);
    api.getOrderTickets(orderId)
      .then(({ tickets: t }) => {
        setTickets(t || []);
        setActiveTicketId((current) => current || t?.[0]?.id || null);
      })
      .catch((err) => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (visible) loadTickets();
  }, [visible, loadTickets]);

  const submitNew = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Describe the issue');
      return;
    }
    setSubmitting(true);
    try {
      const { ticket } = await api.createSupportTicket({
        orderId,
        issueType,
        message: message.trim(),
      });
      setMessage('');
      setActiveTicketId(ticket.id);
      await loadTickets();
      Alert.alert('Sent', 'Your support request was saved.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async () => {
    if (!activeTicketId || !reply.trim()) return;
    setSubmitting(true);
    try {
      await api.addTicketMessage(activeTicketId, reply.trim());
      setReply('');
      await loadTickets();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.heading}>Order support</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#1a7f4b" style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              {tickets.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Previous requests</Text>
                  {tickets.map((ticket) => (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[styles.ticketRow, activeTicketId === ticket.id && styles.ticketRowActive]}
                      onPress={() => setActiveTicketId(ticket.id)}
                    >
                      <Text style={styles.ticketType}>{ISSUE_LABELS[ticket.issueType] || ticket.issueType}</Text>
                      <Text style={styles.ticketStatus}>{ticket.ticketStatus}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activeTicket?.messages?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Conversation</Text>
                  {activeTicket.messages.map((msg) => (
                    <View key={msg.id} style={styles.message}>
                      <Text style={styles.messageMeta}>
                        {msg.sender?.name || msg.senderRole} · {new Date(msg.createdAt).toLocaleString()}
                      </Text>
                      <Text style={styles.messageBody}>{msg.body}</Text>
                    </View>
                  ))}
                  {activeTicket.ticketStatus !== 'Resolved' && (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Add a follow-up message"
                        value={reply}
                        onChangeText={setReply}
                        multiline
                      />
                      <TouchableOpacity style={styles.btnOutline} onPress={submitReply} disabled={submitting}>
                        <Text style={styles.btnOutlineText}>{submitting ? 'Sending...' : 'Send reply'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New support request</Text>
                <View style={styles.issueRow}>
                  {Object.values(TicketIssueType).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.issueChip, issueType === type && styles.issueChipActive]}
                      onPress={() => setIssueType(type)}
                    >
                      <Text style={[styles.issueChipText, issueType === type && styles.issueChipTextActive]}>
                        {ISSUE_LABELS[type]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Describe the issue in detail"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <TouchableOpacity style={styles.btn} onPress={submitNew} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit request</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8e6d4',
    backgroundColor: '#f0faf4',
  },
  helpBtnCompact: { paddingHorizontal: 6 },
  helpIcon: { color: '#1a7f4b', fontWeight: '800', fontSize: 14 },
  helpLabel: { color: '#1a7f4b', fontWeight: '700', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  heading: { fontSize: 18, fontWeight: '700' },
  close: { color: '#1a7f4b', fontWeight: '700' },
  body: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#333' },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 6 },
  ticketRowActive: { borderColor: '#1a7f4b', backgroundColor: '#f0faf4' },
  ticketType: { fontSize: 13, fontWeight: '600', flex: 1 },
  ticketStatus: { fontSize: 12, color: '#666' },
  message: { backgroundColor: '#f8faf9', padding: 10, borderRadius: 8, marginBottom: 8 },
  messageMeta: { fontSize: 11, color: '#888', marginBottom: 4 },
  messageBody: { fontSize: 14, color: '#333', lineHeight: 20 },
  issueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  issueChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#ddd' },
  issueChipActive: { borderColor: '#1a7f4b', backgroundColor: '#e8f5ee' },
  issueChipText: { fontSize: 11, color: '#666' },
  issueChipTextActive: { color: '#1a7f4b', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fafafa', marginBottom: 10 },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: '#1a7f4b', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnOutlineText: { color: '#1a7f4b', fontWeight: '700' },
});
