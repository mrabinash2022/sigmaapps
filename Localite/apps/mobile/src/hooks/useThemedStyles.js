import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors]);
}
