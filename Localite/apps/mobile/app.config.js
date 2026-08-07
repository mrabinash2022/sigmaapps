export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL
      || config.extra?.apiUrl
      || 'http://localhost:5000',
  },
});
