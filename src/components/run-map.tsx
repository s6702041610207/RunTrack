import { forwardRef, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, { PROVIDER_GOOGLE, Polyline, Region } from "react-native-maps";

import { PawTrackColors } from "@/constants/theme";
import { usePawTrackColorScheme } from "@/hooks/use-theme-preference";
import { RunPoint } from "@/utils/geo";

export type RunMapHandle = {
  centerOn: (region: Region) => void;
};

type Props = {
  path: RunPoint[];
  initialRegion: Region;
};

const RunMap = forwardRef<RunMapHandle, Props>(function RunMap({ path, initialRegion }, ref) {
  const mapRef = useRef<MapView>(null);
  const scheme = usePawTrackColorScheme();
  const colors = PawTrackColors[scheme];

  useImperativeHandle(ref, () => ({
    centerOn: (region) => mapRef.current?.animateToRegion(region, 300),
  }));

  return (
    <MapView
      ref={mapRef}
      // Expo Go บน iOS ไม่ได้ฝัง Google Maps SDK มาให้ (ต่างจาก Android ที่มีในตัว)
      // ใช้ PROVIDER_GOOGLE ได้เฉพาะ Android เท่านั้น — iOS ใช้ Apple Maps (MapKit) แทน
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      style={styles.map}
      initialRegion={initialRegion}
      // จุดฟ้า "ตำแหน่งของฉัน" ของระบบปฏิบัติการเอง + กล้องตามตำแหน่งอัตโนมัติระหว่างวิ่ง
      showsUserLocation
      followsUserLocation
      showsMyLocationButton={false}
    >
      {path.length > 1 && (
        <Polyline coordinates={path} strokeColor={colors.pet} strokeWidth={5} />
      )}
    </MapView>
  );
});

export default RunMap;

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
