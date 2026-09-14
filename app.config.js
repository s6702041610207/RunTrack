// ใช้ app.config.js แทน app.json เพื่อดึง Google Maps API key จาก .env
// แทนที่จะฝัง key ตรงๆ ในไฟล์ที่ commit ขึ้น GitHub (repo นี้เป็น public)
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

module.exports = {
  expo: {
    name: "Run Tracker",
    slug: "RunTrack",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "runtrack",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.sitarin.pawtrack",
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow Run Tracker to use your location to record your running route.",
        },
      ],
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
          iosGoogleMapsApiKey: "",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      // GitHub Pages เสิร์ฟที่ /RunTrack/ ไม่ใช่ root domain — asset ทุกตัวต้องมี prefix นี้
      // ตั้งผ่าน env var EXPO_BASE_URL (set เฉพาะตอน build ใน GitHub Actions) กันไม่ให้กระทบตอน dev ในเครื่อง
      baseUrl: process.env.EXPO_BASE_URL ?? "",
    },
  },
};
