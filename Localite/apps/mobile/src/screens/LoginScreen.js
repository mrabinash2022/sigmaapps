import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '@localite/shared';
import { api } from '../services/api';
import { DEV_DEMO_CUSTOMERS, DEV_DEMO_STORES, DEV_DEMO_SUPER_ADMIN, DEV_OTP, DEV_SEEDED_SHOP_OWNERS, shouldShowDevDemoAccounts } from '../config/devDemoAccounts';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    loginPassword,
    loginOtp,
    registerSendEmailCode,
    registerVerifyEmailCode,
    registerPassword,
  } = useAuth();

  const [mode, setMode] = useState('password');
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('8888888888');
  const [password, setPassword] = useState('Customer@123');
  const [phone, setPhone] = useState('8888888888');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [joinAs, setJoinAs] = useState(UserRole.CUSTOMER);
  const [loading, setLoading] = useState(false);

  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devAccountsOpen, setDevAccountsOpen] = useState(true);
  const [customersOpen, setCustomersOpen] = useState(true);
  const [storesOpen, setStoresOpen] = useState(true);
  const [shopOwnersOpen, setShopOwnersOpen] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const applyDemoAccount = (account) => {
    setMode('password');
    setIsRegister(false);
    setIdentifier(account.phone);
    setPhone(account.phone);
    setPassword(account.password);
  };

  const loadCaptcha = useCallback(async () => {
    try {
      const data = await api.getCaptcha();
      setCaptchaToken(data.captchaToken);
      setCaptchaQuestion(data.question);
      setCaptchaAnswer('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load captcha');
    }
  }, []);

  useEffect(() => {
    if (isRegister) loadCaptcha();
  }, [isRegister, loadCaptcha]);

  const invalidateRegisterEmailVerification = () => {
    setEmailVerified(false);
    setRegistrationToken(null);
    setEmailOtp('');
  };

  const resetRegisterState = () => {
    setEmailCodeSent(false);
    setMaskedEmail('');
    setCaptchaAnswer('');
    invalidateRegisterEmailVerification();
    loadCaptcha();
  };

  const onRegisterEmailChange = (value) => {
    setEmail(value);
    if (emailCodeSent || emailVerified) invalidateRegisterEmailVerification();
    if (emailCodeSent) setEmailCodeSent(false);
  };

  const onRegisterPhoneChange = (value) => {
    setPhone(value);
    if (emailCodeSent || emailVerified) invalidateRegisterEmailVerification();
    if (emailCodeSent) setEmailCodeSent(false);
  };

  const handlePasswordLogin = async () => {
    setLoading(true);
    try {
      await loginPassword(identifier.trim(), password);
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSendOtp = async () => {
    if (!forgotPhone.trim()) {
      Alert.alert('Error', 'Enter your registered phone number');
      return;
    }
    setLoading(true);
    try {
      await api.forgotPasswordSendOtp(forgotPhone.trim());
      setForgotSent(true);
      Alert.alert('Code sent', 'Enter the OTP sent to your phone and choose a new password.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async () => {
    if (!forgotPhone.trim() || !forgotOtp.trim() || !forgotPassword) {
      Alert.alert('Error', 'Phone, OTP, and new password are required');
      return;
    }
    setLoading(true);
    try {
      await api.forgotPasswordReset(forgotPhone.trim(), forgotOtp.trim(), forgotPassword);
      Alert.alert('Password reset', 'You can now log in with your new password.');
      setShowForgot(false);
      setForgotSent(false);
      setForgotOtp('');
      setForgotPassword('');
      setIdentifier(forgotPhone.trim());
      setPassword(forgotPassword);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRegisterCode = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Name, phone, email, and password are required');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      Alert.alert('Error', 'Enter a valid email address');
      return;
    }
    if (!captchaAnswer.trim()) {
      Alert.alert('Error', 'Solve the captcha to continue');
      return;
    }
    setLoading(true);
    try {
      const res = await registerSendEmailCode({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: joinAs,
        captchaToken,
        captchaAnswer: captchaAnswer.trim(),
      });
      setEmailCodeSent(true);
      setEmailVerified(false);
      setRegistrationToken(null);
      setMaskedEmail(res.email);
      setEmailOtp('');
      Alert.alert('Code sent', `Verification code sent to ${res.email}. Dev mode: check API console.`);
      await loadCaptcha();
    } catch (err) {
      Alert.alert('Error', err.message);
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegisterEmail = async () => {
    if (!emailCodeSent) {
      Alert.alert('Error', 'Send the email verification code first');
      return;
    }
    if (!emailOtp.trim()) {
      Alert.alert('Error', 'Enter the verification code from your email');
      return;
    }
    setLoading(true);
    try {
      const res = await registerVerifyEmailCode({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        emailOtp: emailOtp.trim(),
      });
      setEmailVerified(true);
      setRegistrationToken(res.registrationToken);
      Alert.alert('Email verified', 'You can now tap Register to create your account.');
    } catch (err) {
      Alert.alert('Verification failed', err.message);
      setEmailVerified(false);
      setRegistrationToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!emailVerified || !registrationToken) {
      Alert.alert('Error', 'Verify your email code before registering');
      return;
    }
    if (!captchaAnswer.trim()) {
      Alert.alert('Error', 'Solve the captcha to continue');
      return;
    }
    setLoading(true);
    try {
      await registerPassword({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: joinAs,
        username: phone.trim(),
        registrationToken,
        captchaToken,
        captchaAnswer: captchaAnswer.trim(),
      });
      resetRegisterState();
    } catch (err) {
      Alert.alert('Registration failed', err.message);
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await api.sendOtp(phone.trim());
      setOtpSent(true);
      Alert.alert('OTP sent', 'Check your phone. Dev mode: use 123456');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    setLoading(true);
    try {
      await loginOtp(phone.trim(), otp.trim());
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegister = () => {
    setIsRegister(!isRegister);
    resetRegisterState();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Localite</Text>
      <Text style={styles.tagline}>Order from shops you already trust</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, mode === 'password' && styles.tabActive]} onPress={() => setMode('password')}>
          <Text style={styles.tabText}>Password</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode === 'otp' && styles.tabActive]} onPress={() => setMode('otp')}>
          <Text style={styles.tabText}>OTP</Text>
        </TouchableOpacity>
      </View>

      {mode === 'password' && (
        <>
          {isRegister && (
            <>
              <TextInput style={styles.input} placeholder="Full name *" value={name} onChangeText={setName} />
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, joinAs === UserRole.CUSTOMER && styles.roleActive]}
                  onPress={() => setJoinAs(UserRole.CUSTOMER)}
                >
                  <Text>Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, joinAs === UserRole.ADMIN && styles.roleActive]}
                  onPress={() => setJoinAs(UserRole.ADMIN)}
                >
                  <Text>Store Owner</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <TextInput
            style={styles.input}
            placeholder={isRegister ? 'Phone number *' : 'Phone / username / email'}
            value={isRegister ? phone : identifier}
            onChangeText={isRegister ? onRegisterPhoneChange : setIdentifier}
            keyboardType="phone-pad"
            testID="login-identifier"
          />
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Email address *"
              value={email}
              onChangeText={onRegisterEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Password *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="login-password"
          />

          {isRegister && (
            <View style={styles.captchaBox}>
              <Text style={styles.captchaLabel}>Security check *</Text>
              <Text style={styles.captchaQuestion}>{captchaQuestion || 'Loading captcha...'}</Text>
              <TextInput
                style={styles.input}
                placeholder="Captcha answer"
                value={captchaAnswer}
                onChangeText={setCaptchaAnswer}
                keyboardType="number-pad"
              />
              <TouchableOpacity onPress={loadCaptcha}>
                <Text style={styles.link}>Refresh captcha</Text>
              </TouchableOpacity>
            </View>
          )}

          {isRegister && (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleSendRegisterCode} disabled={loading}>
                {loading && !emailCodeSent ? <ActivityIndicator color="#1a7f4b" /> : (
                  <Text style={styles.secondaryBtnText}>
                    {emailCodeSent ? 'Resend email verification code' : 'Send email verification code'}
                  </Text>
                )}
              </TouchableOpacity>

              {emailCodeSent && (
                <View style={styles.verifyBox}>
                  <Text style={styles.verifyTitle}>Email verification</Text>
                  <Text style={styles.hint}>
                    Enter the code sent to {maskedEmail}
                    {emailVerified ? ' — verified' : ''}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email verification code *"
                    value={emailOtp}
                    onChangeText={(value) => {
                      setEmailOtp(value);
                      if (emailVerified) invalidateRegisterEmailVerification();
                    }}
                    keyboardType="number-pad"
                    editable={!emailVerified}
                  />
                  {!emailVerified ? (
                    <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyRegisterEmail} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : (
                        <Text style={styles.btnText}>Verify email code</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.verifiedText}>Email verified. Tap Register below.</Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, !emailVerified && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading || !emailVerified}
              >
                {loading && emailVerified ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnText}>Register</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {!isRegister && !showForgot && (
            <TouchableOpacity onPress={() => setShowForgot(true)}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {!isRegister && showForgot && (
            <View style={styles.verifyBox}>
              <Text style={styles.verifyTitle}>Reset password</Text>
              <TextInput
                style={styles.input}
                placeholder="Registered phone number"
                value={forgotPhone}
                onChangeText={setForgotPhone}
                keyboardType="phone-pad"
              />
              {!forgotSent ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleForgotSendOtp} disabled={loading}>
                  <Text style={styles.secondaryBtnText}>Send reset code</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="OTP from SMS"
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    value={forgotPassword}
                    onChangeText={setForgotPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.verifyBtn} onPress={handleForgotReset} disabled={loading}>
                    <Text style={styles.btnText}>Reset password</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => { setShowForgot(false); setForgotSent(false); }}>
                <Text style={styles.link}>Back to login</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isRegister && !showForgot && (
            <TouchableOpacity style={styles.btn} onPress={handlePasswordLogin} disabled={loading} testID="login-submit">
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={toggleRegister}>
            <Text style={styles.link}>{isRegister ? 'Already have an account? Login' : 'New here? Register'}</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'otp' && (
        <>
          <TextInput style={styles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {!otpSent ? (
            <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.btnText}>Send OTP</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput style={styles.input} placeholder="Enter phone OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
              <TouchableOpacity style={styles.btn} onPress={handleOtpLogin} disabled={loading}>
                <Text style={styles.btnText}>Verify phone & continue</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {shouldShowDevDemoAccounts() && (
        <View style={styles.devBox}>
          <TouchableOpacity
            style={styles.devToggle}
            onPress={() => setDevAccountsOpen((open) => !open)}
          >
            <Text style={styles.devToggleText}>
              {devAccountsOpen ? '▼' : '▶'} Dev demo accounts
            </Text>
          </TouchableOpacity>

          {devAccountsOpen && (
            <View style={styles.devContent}>
              <Text style={styles.devNote}>
                Development only. Phone OTP & email verification code: {DEV_OTP}
              </Text>
              <Text style={styles.devHint}>
                Email OTP is logged in the API console when you register.
              </Text>

              <TouchableOpacity
                style={styles.devSubToggle}
                onPress={() => setCustomersOpen((open) => !open)}
              >
                <Text style={styles.devSubToggleText}>
                  {customersOpen ? '▼' : '▶'} Customers ({DEV_DEMO_CUSTOMERS.length})
                </Text>
              </TouchableOpacity>

              {customersOpen && DEV_DEMO_CUSTOMERS.map((account) => (
                <TouchableOpacity
                  key={account.phone}
                  style={styles.devCard}
                  onPress={() => applyDemoAccount(account)}
                >
                  <Text style={styles.devRole}>{account.label}</Text>
                  <Text style={styles.devLine}>Phone: {account.phone}</Text>
                  <Text style={styles.devLine}>Username: {account.username}</Text>
                  <Text style={styles.devLine}>Password: {account.password}</Text>
                  <Text style={styles.devTap}>Tap to fill login form</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.devSubToggle}
                onPress={() => setStoresOpen((open) => !open)}
              >
                <Text style={styles.devSubToggleText}>
                  {storesOpen ? '▼' : '▶'} Stores ({DEV_DEMO_STORES.length})
                </Text>
              </TouchableOpacity>

              {storesOpen && (
                <View style={styles.devShopList}>
                  <Text style={styles.devLine}>
                    Password for all: {DEV_DEMO_STORES[0]?.password}
                  </Text>
                  {DEV_DEMO_STORES.map((store) => (
                    <TouchableOpacity
                      key={store.phone}
                      style={styles.devShopRow}
                      onPress={() => applyDemoAccount({
                        phone: store.phone,
                        password: store.password,
                      })}
                    >
                      <Text style={styles.devShopPhone}>{store.label}</Text>
                      <Text style={styles.devShopName}>{store.shop}</Text>
                      <Text style={styles.devHint}>{store.phone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.devCard}
                onPress={() => applyDemoAccount(DEV_DEMO_SUPER_ADMIN)}
              >
                <Text style={styles.devRole}>{DEV_DEMO_SUPER_ADMIN.label}</Text>
                <Text style={styles.devLine}>Phone: {DEV_DEMO_SUPER_ADMIN.phone}</Text>
                <Text style={styles.devLine}>Username: {DEV_DEMO_SUPER_ADMIN.username}</Text>
                <Text style={styles.devLine}>Password: {DEV_DEMO_SUPER_ADMIN.password}</Text>
                <Text style={styles.devTap}>Tap to fill login form</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.devSubToggle}
                onPress={() => setShopOwnersOpen((open) => !open)}
              >
                <Text style={styles.devSubToggleText}>
                  {shopOwnersOpen ? '▼' : '▶'} More seeded stores ({DEV_SEEDED_SHOP_OWNERS.phones.length})
                </Text>
              </TouchableOpacity>

              {shopOwnersOpen && (
                <View style={styles.devShopList}>
                  <Text style={styles.devLine}>
                    Password for all: {DEV_SEEDED_SHOP_OWNERS.password}
                  </Text>
                  {DEV_SEEDED_SHOP_OWNERS.phones.map((owner) => (
                    <TouchableOpacity
                      key={owner.phone}
                      style={styles.devShopRow}
                      onPress={() => applyDemoAccount({
                        phone: owner.phone,
                        password: DEV_SEEDED_SHOP_OWNERS.password,
                      })}
                    >
                      <Text style={styles.devShopPhone}>{owner.phone}</Text>
                      <Text style={styles.devShopName}>{owner.shop}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingTop: 60, paddingBottom: 48 },
    brand: { fontSize: 36, fontWeight: '800', color: colors.brand, textAlign: 'center' },
    tagline: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 8 },
    tabRow: { flexDirection: 'row', marginBottom: 20, gap: 8 },
    tab: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    tabActive: { borderColor: colors.brand, backgroundColor: colors.accentSurface },
    tabText: { fontWeight: '600', color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      padding: 14,
      marginBottom: 12,
      backgroundColor: colors.inputBg,
      color: colors.text,
      fontSize: 16,
    },
    roleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    roleBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    roleActive: { borderColor: colors.brand, backgroundColor: colors.accentSurface },
    captchaBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    captchaLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
    captchaQuestion: { fontSize: 16, fontWeight: '600', color: colors.brand, marginBottom: 8 },
    verifyBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.brandBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    verifyTitle: { fontSize: 15, fontWeight: '700', color: colors.brand, marginBottom: 4 },
    hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
    verifiedText: { fontSize: 13, color: colors.brand, fontWeight: '600', marginBottom: 8 },
    btn: { backgroundColor: colors.brandDark, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
    btnDisabled: { backgroundColor: '#9ca3af' },
    verifyBtn: { backgroundColor: colors.brandDark, padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 4 },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.brand,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
      backgroundColor: colors.card,
    },
    secondaryBtnText: { color: colors.brand, fontWeight: '700' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    link: { color: colors.brand, textAlign: 'center', marginTop: 16, fontWeight: '600' },
    devBox: {
      marginTop: 28,
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? '#854d0e' : '#fcd34d',
      borderRadius: 10,
      backgroundColor: colors.mode === 'dark' ? '#292524' : '#fffbeb',
      overflow: 'hidden',
    },
    devToggle: { padding: 14 },
    devToggleText: { fontSize: 14, fontWeight: '700', color: colors.mode === 'dark' ? '#fbbf24' : '#92400e' },
    devContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
    devNote: { fontSize: 13, fontWeight: '600', color: colors.mode === 'dark' ? '#fcd34d' : '#78350f', lineHeight: 18 },
    devHint: { fontSize: 12, color: colors.mode === 'dark' ? '#fbbf24' : '#a16207', lineHeight: 17 },
    devCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? '#854d0e' : '#fde68a',
      borderRadius: 8,
      padding: 10,
    },
    devRole: { fontSize: 14, fontWeight: '700', color: colors.brand, marginBottom: 4 },
    devLine: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    devTap: { fontSize: 11, color: colors.brand, fontWeight: '600', marginTop: 6 },
    devSubToggle: { paddingVertical: 6 },
    devSubToggleText: { fontSize: 13, fontWeight: '700', color: colors.mode === 'dark' ? '#fbbf24' : '#92400e' },
    devShopList: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? '#854d0e' : '#fde68a',
      borderRadius: 8,
      padding: 10,
      gap: 6,
    },
    devShopRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    devShopPhone: { fontSize: 12, fontWeight: '700', color: colors.text, width: 88 },
    devShopName: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  });
}
