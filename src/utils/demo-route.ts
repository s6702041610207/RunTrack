// สร้างเส้นทางจำลองไว้ใช้ตอน "โหมดสาธิต" — จำลองการวิ่งวนรอบเป็นสี่เหลี่ยม
// เอาไว้ present จากคอม/เครื่องที่ไม่ได้ขยับจริง โดยยังใช้ pipeline คำนวณระยะ/เวลา/ความสูงตัวเดียวกับ GPS จริง

export type DemoPoint = {
  latitude: number;
  longitude: number;
  altitude: number;
};

const METERS_PER_LAT_DEGREE = 111320;

function metersToLatDelta(meters: number): number {
  return meters / METERS_PER_LAT_DEGREE;
}

function metersToLngDelta(meters: number, atLatitude: number): number {
  return meters / (METERS_PER_LAT_DEGREE * Math.cos((atLatitude * Math.PI) / 180));
}

// เดินวนสี่เหลี่ยม เหนือ-ตะวันออก-ใต้-ตะวันตก กลับมาจุดเริ่มพอดี รวมความยาว ~720 เมตร
const LEGS: { bearingDeg: number; distanceMeters: number }[] = [
  { bearingDeg: 0, distanceMeters: 220 },
  { bearingDeg: 90, distanceMeters: 140 },
  { bearingDeg: 180, distanceMeters: 220 },
  { bearingDeg: 270, distanceMeters: 140 },
];

const STEP_METERS = 6; // ระยะห่างระหว่างจุดจำลองแต่ละจุด

export function buildDemoRoute(origin: { latitude: number; longitude: number }): DemoPoint[] {
  const points: DemoPoint[] = [{ latitude: origin.latitude, longitude: origin.longitude, altitude: 15 }];

  let lat = origin.latitude;
  let lng = origin.longitude;
  let distanceSoFar = 0;

  for (const leg of LEGS) {
    const steps = Math.round(leg.distanceMeters / STEP_METERS);
    const rad = (leg.bearingDeg * Math.PI) / 180;

    for (let i = 0; i < steps; i++) {
      lat += metersToLatDelta(STEP_METERS * Math.cos(rad));
      lng += metersToLngDelta(STEP_METERS * Math.sin(rad), lat);
      distanceSoFar += STEP_METERS;

      // แกว่งความสูงเบาๆ ให้เห็นค่า elevation gain สะสมขึ้นระหว่าง demo ด้วย
      const altitude = 15 + Math.sin(distanceSoFar / 80) * 4;
      points.push({ latitude: lat, longitude: lng, altitude });
    }
  }

  return points;
}
