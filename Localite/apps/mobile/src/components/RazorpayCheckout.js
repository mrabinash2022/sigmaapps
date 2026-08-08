import React, { useMemo } from 'react';
import { Modal, View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function RazorpayCheckout({ visible, checkout, onSuccess, onClose, onError }) {
  const html = useMemo(() => {
    if (!checkout) return null;
    const { keyId, razorpayOrderId, amount, currency, orderId, customerName, customerPhone } = checkout;
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  const options = {
    key: ${JSON.stringify(keyId)},
    amount: ${Number(amount)},
    currency: ${JSON.stringify(currency || 'INR')},
    name: 'Localite',
    description: 'Order payment',
    order_id: ${JSON.stringify(razorpayOrderId)},
    prefill: { name: ${JSON.stringify(customerName || '')}, contact: ${JSON.stringify(customerPhone || '')} },
    theme: { color: '#1a7f4b' },
    handler: function (response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', ...response, orderId: ${JSON.stringify(orderId)} }));
    },
    modal: {
      ondismiss: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
      }
    }
  };
  const rzp = new Razorpay(options);
  rzp.on('payment.failed', function (response) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'failed', error: response.error }));
  });
  rzp.open();
</script></body></html>`;
  }, [checkout]);

  if (!visible || !html) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          startInLoadingState
          renderLoading={() => <ActivityIndicator style={styles.loader} size="large" color="#1a7f4b" />}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'success') onSuccess(data);
              else if (data.type === 'failed') onError(data.error?.description || 'Payment failed');
              else onClose();
            } catch {
              onError('Invalid payment response');
            }
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center' },
});
