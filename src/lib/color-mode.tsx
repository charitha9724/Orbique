import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Light / dark / automatic (follow the phone's setting). Remembered on this device.

export type ColorMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'orbique.colorMode';

const ColorModeContext = createContext<{ mode: ColorMode; setMode: (mode: ColorMode) => void }>({
  mode: 'system',
  setMode: () => {},
});

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  return <ColorModeContext.Provider value={{ mode, setMode }}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
  return useContext(ColorModeContext);
}
