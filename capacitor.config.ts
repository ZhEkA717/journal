import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.journals.app',
  appName: 'Журналы',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1E40AF',
    },
    Keyboard: {
      resize: 'body',
    },
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
