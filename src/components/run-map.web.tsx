import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { Ionicons } from "@expo/vector-icons";

import { PawTrackColors, PawTrackPalette } from "@/constants/theme";
import { usePawTrackColorScheme } from "@/hooks/use-theme-preference";
import { RunPoint, RunRegion } from "@/utils/geo";

export type RunMapHandle = {
  centerOn: (region: { latitude: number; longitude: number }) => void;
};

type Props = {
  path: RunPoint[];
  initialRegion: RunRegion;
};

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const mapContainerStyle = { width: "100%", height: "100%" };
const DEFAULT_ZOOM = 17;

// react-native-maps ไม่รองรับ web จึงใช้ Google Maps JavaScript SDK แทนเฉพาะบน web
// เก็บ interface (centerOn/props) เดียวกับเวอร์ชัน native เพื่อให้หน้าจอหลักเรียกใช้ได้แบบไม่ต้องเช็ค platform เอง
const RunMap = forwardRef<RunMapHandle, Props>(function RunMap({ path, initialRegion }, ref) {
  const scheme = usePawTrackColorScheme();
  const colors = PawTrackColors[scheme];
  const mapInstance = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "pawtrack-google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? "",
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapInstance.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapInstance.current = null;
  }, []);

  useImperativeHandle(ref, () => ({
    centerOn: (region) => mapInstance.current?.panTo({ lat: region.latitude, lng: region.longitude }),
  }));

  // เบราว์เซอร์ไม่มี "followsUserLocation" ในตัวเหมือน native — จำลองด้วยการ pan
  // ไปที่จุดล่าสุดของเส้นทางทุกครั้งที่มีพิกัดใหม่เพิ่มเข้ามา
  useEffect(() => {
    const last = path[path.length - 1];
    if (last) {
      mapInstance.current?.panTo({ lat: last.latitude, lng: last.longitude });
    }
  }, [path]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <FallbackMessage
        colors={colors}
        title="ยังไม่ได้ตั้งค่า Google Maps API key สำหรับ web"
      />
    );
  }
  if (loadError) {
    return <FallbackMessage colors={colors} title="โหลดแผนที่ไม่สำเร็จ" />;
  }
  if (!isLoaded) {
    return <FallbackMessage colors={colors} title="กำลังโหลดแผนที่..." />;
  }

  const last = path[path.length - 1];

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={{ lat: initialRegion.latitude, lng: initialRegion.longitude }}
      zoom={DEFAULT_ZOOM}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      {path.length > 1 && (
        <Polyline
          path={path.map((p) => ({ lat: p.latitude, lng: p.longitude }))}
          options={{ strokeColor: colors.pet, strokeWeight: 5 }}
        />
      )}
      {last && <Marker position={{ lat: last.latitude, lng: last.longitude }} />}
    </GoogleMap>
  );
});

export default RunMap;

function FallbackMessage({ colors, title }: { colors: PawTrackPalette; title: string }) {
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMuted }]}>
      <Ionicons name="map-outline" size={40} color={colors.textSecondary} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 6,
  },
  text: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});
