import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solodeveloper.tourpro',
  appName: 'TourPro360',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    Camera: {
      saveToGallery: false
    }
  }
};

export default config;
