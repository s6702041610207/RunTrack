// พิกัด 1 จุดที่บันทึกไว้ระหว่างวิ่ง/เดิน
export type RunPoint = {
  latitude: number;
  longitude: number;
  timestamp: number; // ms since epoch
  altitude?: number | null; // เมตรเหนือระดับน้ำทะเล — ใช้คำนวณ elevation gain
};

export type RunRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type ActivityType = "run" | "walk" | "cycle";

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string }> = {
  run: { label: "วิ่ง", icon: "run" },
  walk: { label: "เดิน", icon: "walk" },
  cycle: { label: "ปั่นจักรยาน", icon: "bike" },
};

// การวิ่ง/เดิน/ปั่นจักรยาน 1 ครั้งที่บันทึกเสร็จแล้ว (เก็บใน Firestore collection "runs")
export type Run = {
  id: string;
  activityType: ActivityType;
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp
  durationSeconds: number;
  distanceMeters: number;
  elevationGainMeters: number;
  path: RunPoint[];
};

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ระยะทางระหว่าง 2 จุดพิกัด (สูตร Haversine) หน่วยเป็นเมตร
export function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(h));
}

// ระยะทางรวมของเส้นทางทั้งหมด (ไล่บวกทีละช่วง)
export function totalDistance(path: RunPoint[]): number {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    sum += haversineDistance(path[i - 1], path[i]);
  }
  return sum;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} ม.`;
  return `${(meters / 1000).toFixed(2)} กม.`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// เพซเฉลี่ย (นาที:วินาที ต่อกิโลเมตร) — ค่ามาตรฐานที่นักวิ่งใช้ดูความเร็ว
export function formatPace(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters <= 0 || durationSeconds <= 0) return "-";
  const paceSecPerKm = durationSeconds / (distanceMeters / 1000);
  const min = Math.floor(paceSecPerKm / 60);
  const sec = Math.round(paceSecPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")} /กม.`;
}

export function formatElevation(meters: number): string {
  return `+${Math.round(meters)} ม.`;
}

export type Split = {
  index: number; // ลำดับ split เริ่มจาก 1
  distanceMeters: number; // 1000 สำหรับ split เต็มกิโล, น้อยกว่านั้นสำหรับ split สุดท้าย (เศษ)
  durationSeconds: number;
  isPartial: boolean;
};

const SPLIT_DISTANCE_METERS = 1000;
// เศษระยะที่เหลือต้องมากกว่านี้ถึงจะโชว์เป็น split สุดท้าย — กันโชว์แถวที่แทบไม่มีความหมาย (เช่น เหลือ 3 เมตร)
const MIN_PARTIAL_SPLIT_METERS = 50;

// แบ่งเวลาที่ใช้ต่อกิโลเมตร (split time) จาก path ที่มีอยู่แล้ว — คำนวณฝั่ง client ล้วนๆ
// ไม่ต้องเก็บ field เพิ่มใน Firestore เพราะคำนวณใหม่ได้จาก path ทุกครั้งที่เปิดดู
export function computeSplits(path: RunPoint[]): Split[] {
  if (path.length < 2) return [];

  const splits: Split[] = [];
  let cumulativeDistance = 0;
  let nextBoundary = SPLIT_DISTANCE_METERS;
  let lastSplitTimestamp = path[0].timestamp;

  for (let i = 1; i < path.length; i++) {
    const segment = haversineDistance(path[i - 1], path[i]);
    const segmentStartDistance = cumulativeDistance;
    cumulativeDistance += segment;

    // จุดเดียวอาจพาข้ามหลายหลักกิโลพร้อมกันได้ (เช่น GPS update ห่างกันนาน) เลยต้อง while ไม่ใช่ if
    while (cumulativeDistance >= nextBoundary) {
      const distanceIntoSegment = nextBoundary - segmentStartDistance;
      const fraction = segment > 0 ? distanceIntoSegment / segment : 0;
      const splitTimestamp = path[i - 1].timestamp + fraction * (path[i].timestamp - path[i - 1].timestamp);

      splits.push({
        index: splits.length + 1,
        distanceMeters: SPLIT_DISTANCE_METERS,
        durationSeconds: (splitTimestamp - lastSplitTimestamp) / 1000,
        isPartial: false,
      });

      lastSplitTimestamp = splitTimestamp;
      nextBoundary += SPLIT_DISTANCE_METERS;
    }
  }

  const remainingDistance = cumulativeDistance - (nextBoundary - SPLIT_DISTANCE_METERS);
  if (remainingDistance > MIN_PARTIAL_SPLIT_METERS) {
    const lastPoint = path[path.length - 1];
    splits.push({
      index: splits.length + 1,
      distanceMeters: remainingDistance,
      durationSeconds: (lastPoint.timestamp - lastSplitTimestamp) / 1000,
      isPartial: true,
    });
  }

  return splits;
}

function startOfWeek(date: Date): Date {
  // เริ่มสัปดาห์ที่วันจันทร์ (แบบไทย/สากลทั่วไป ไม่ใช่วันอาทิตย์แบบสหรัฐฯ)
  const d = new Date(date);
  const day = d.getDay(); // 0 = อาทิตย์, 1 = จันทร์, ...
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export type RunsSummary = {
  weekDistanceMeters: number;
  weekCount: number;
  monthDistanceMeters: number;
  monthCount: number;
  longestRun: Run | null;
  fastestRun: Run | null; // เพซเฉลี่ยดีที่สุด (เวลาน้อยสุดต่อกิโลเมตร)
};

// สรุปสถิติภาพรวมจากประวัติทั้งหมด — ใช้ข้อมูลที่มีอยู่แล้ว ไม่ต้องเพิ่ม field ใหม่ใน Firestore
export function summarizeRuns(runs: Run[]): RunsSummary {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const summary: RunsSummary = {
    weekDistanceMeters: 0,
    weekCount: 0,
    monthDistanceMeters: 0,
    monthCount: 0,
    longestRun: null,
    fastestRun: null,
  };

  let fastestPaceSecPerKm = Infinity;

  for (const run of runs) {
    const startedAt = new Date(run.startedAt);

    if (startedAt >= weekStart) {
      summary.weekDistanceMeters += run.distanceMeters;
      summary.weekCount += 1;
    }
    if (startedAt >= monthStart) {
      summary.monthDistanceMeters += run.distanceMeters;
      summary.monthCount += 1;
    }
    if (!summary.longestRun || run.distanceMeters > summary.longestRun.distanceMeters) {
      summary.longestRun = run;
    }
    if (run.distanceMeters > 0 && run.durationSeconds > 0) {
      const pace = run.durationSeconds / (run.distanceMeters / 1000);
      if (pace < fastestPaceSecPerKm) {
        fastestPaceSecPerKm = pace;
        summary.fastestRun = run;
      }
    }
  }

  return summary;
}

// คำนวณกรอบแผนที่ (region) ที่ครอบคลุมเส้นทางทั้งหมดพอดี ใช้ตอนเปิดดูประวัติย้อนหลัง
export function regionForPath(path: RunPoint[]): RunRegion {
  if (path.length === 0) {
    return { latitude: 13.7563, longitude: 100.5018, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }

  let minLat = path[0].latitude;
  let maxLat = path[0].latitude;
  let minLng = path[0].longitude;
  let maxLng = path[0].longitude;

  for (const point of path) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.005),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.005),
  };
}
