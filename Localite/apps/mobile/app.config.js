export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL
      || config.extra?.apiUrl
      || 'http://localhost:5000',
    showDemoAccounts: process.env.EXPO_PUBLIC_SHOW_DEMO_ACCOUNTS !== 'false',
  },
});
