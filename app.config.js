// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "bolt-expo-nativewind",
    slug: "bolt-expo-nativewind",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "We use your location to show nearby rides.",
      },
      bundleIdentifier: "com.divijakavishvar.cabby",
    },

    android: {
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
      package: "com.divijakavishvar.cabby",
      versionCode: 1,
    },

    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png",
    },

    plugins: ["expo-router", "expo-font", "expo-web-browser", "expo-location"],

    experiments: {
      typedRoutes: true,
    },
  },
};
