import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { buildDemoRoute } from "@/utils/demo-route";
import { ActivityType, haversineDistance, Run, RunPoint } from "@/utils/geo";

export type RunStatus = "idle" | "running" | "paused";

// ระยะขั้นต่ำต่อช่วง (เมตร) ที่จะนับเข้าระยะทางรวม — กันสัญญาณ GPS/WiFi กระตุกตอนยืนนิ่ง
// ทำให้ระยะทางเพิ่มขึ้นเองทั้งที่ไม่ได้ขยับ (ใช้ค่าเดียวกันเป็นเกณฑ์ตรวจจับ "กำลังเคลื่อนที่" ของ auto-pause ด้วย)
// ตั้งไว้สูงกว่า GPS มือถือทั่วไปเผื่อรันบนเว็บ/คอมที่ไม่มีชิป GPS จริง (ใช้ WiFi/IP หาตำแหน่ง ความแม่นยำหยาบกว่ามาก)
const MIN_SEGMENT_DISTANCE = 5;

// ความสูงที่เพิ่มขึ้นต้องเกินเท่านี้ (เมตร) ถึงจะนับเป็น elevation gain จริง — GPS altitude แกว่งง่ายกว่าพิกัดแนวราบมาก
const MIN_ELEVATION_STEP = 1;

// ถ้าไม่มีการเคลื่อนที่เกินเวลานี้ (ms) ระหว่างกำลังวิ่งอยู่ ให้พักตัวจับเวลาอัตโนมัติ (กันเพซเพี้ยนตอนรอไฟแดง)
const AUTO_PAUSE_TIMEOUT_MS = 15000;

// ไม่รับพิกัดที่ GPS เองก็ไม่มั่นใจ (accuracy = รัศมีความคลาดเคลื่อนโดยประมาณ หน่วยเมตร)
// กันจุดที่หลุดไปไกลๆ ตอนสัญญาณเพิ่งเริ่มจับหรือช่วงอยู่ใต้ตึก/ที่บัง
const MAX_ACCEPTABLE_ACCURACY_METERS = 25;

// ความเร็วที่นัยจากช่วงนั้นๆ (ระยะ/เวลา) ถ้าเกินนี้ถือว่าเป็นสัญญาณ GPS กระโดดผิดปกติ ไม่ใช่การเคลื่อนที่จริง
// (เผื่อไว้ค่อนข้างสูงให้ครอบคลุมถึงปั่นจักรยานเร็วๆ ด้วย ~43 กม./ชม.)
const MAX_PLAUSIBLE_SPEED_MPS = 12;

// จุดเริ่มต้นสำรองของโหมดสาธิต — ใช้เมื่อยังไม่รู้ตำแหน่งจริงของเครื่อง (เช่น demo จากคอม/เว็บ)
const DEMO_FALLBACK_ORIGIN = { latitude: 13.7563, longitude: 100.5018 };

// ความถี่ที่ปล่อยจุดจำลองแต่ละจุดตอน demo (ms) — จำลองจังหวะ GPS update เหมือนของจริง
const DEMO_TICK_INTERVAL_MS = 1200;

export default function useRunTracker() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [path, setPath] = useState<RunPoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elevationGainMeters, setElevationGainMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoRouteRef = useRef<ReturnType<typeof buildDemoRoute>>([]);
  const demoIndexRef = useRef(0);
  const isDemoRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentStartRef = useRef<number | null>(null); // เวลาเริ่มของ "ช่วงที่กำลังนับอยู่ตอนนี้" (รีเซ็ตทุกครั้งที่ resume/auto-resume)
  const accumulatedSecondsRef = useRef(0); // เวลาสะสมจากช่วงก่อนหน้าที่หยุดนับไปแล้ว (พักเอง/พักมือ)
  const runStartedAtRef = useRef<string | null>(null); // เวลาเริ่มวิ่งครั้งแรก (ไม่รีเซ็ตตอน pause/resume)
  const activityTypeRef = useRef<ActivityType>("run");
  const lastMovementAtRef = useRef<number>(Date.now());
  const isAutoPausedRef = useRef(false);

  const stopDemoWatching = () => {
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    demoTimerRef.current = null;
  };

  const stopWatching = () => {
    watcherRef.current?.remove();
    watcherRef.current = null;
    stopDemoWatching();
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (segmentStartRef.current) {
      accumulatedSecondsRef.current += (Date.now() - segmentStartRef.current) / 1000;
      segmentStartRef.current = null;
    }
  };

  const startTimer = () => {
    segmentStartRef.current = Date.now();
    lastMovementAtRef.current = Date.now();
    isAutoPausedRef.current = false;
    setIsAutoPaused(false);

    timerRef.current = setInterval(() => {
      const stale = Date.now() - lastMovementAtRef.current > AUTO_PAUSE_TIMEOUT_MS;

      if (stale !== isAutoPausedRef.current) {
        isAutoPausedRef.current = stale;
        setIsAutoPaused(stale);

        if (stale && segmentStartRef.current) {
          // ไม่มีการเคลื่อนที่นานเกินไป — พักตัวนับเวลาไว้ก่อน (ยังฟัง GPS ต่อเพื่อรอตรวจจับตอนเริ่มเดิน/วิ่งอีกครั้ง)
          accumulatedSecondsRef.current += (Date.now() - segmentStartRef.current) / 1000;
          segmentStartRef.current = null;
        } else if (!stale) {
          // กลับมาเคลื่อนที่แล้ว — นับเวลาต่ออัตโนมัติ
          segmentStartRef.current = Date.now();
        }
      }

      if (!isAutoPausedRef.current && segmentStartRef.current) {
        const segSeconds = (Date.now() - segmentStartRef.current) / 1000;
        setElapsedSeconds(accumulatedSecondsRef.current + segSeconds);
      }
    }, 1000);
  };

  // ประมวลผลจุดพิกัดใหม่ 1 จุด — ใช้ร่วมกันทั้งจาก GPS จริงและจากโหมดสาธิต (จำลองพิกัด)
  const handlePoint = (point: RunPoint) => {
    setPath((prev) => {
      const last = prev[prev.length - 1];

      if (last) {
        const segment = haversineDistance(last, point);
        const timeDeltaSeconds = Math.max((point.timestamp - last.timestamp) / 1000, 0.001);
        const impliedSpeed = segment / timeDeltaSeconds;

        if (impliedSpeed > MAX_PLAUSIBLE_SPEED_MPS) {
          // เดินแค่ก้าวเดียวแต่ระยะพุ่งเป็นร้อยเมตร = สัญญาณ GPS กระโดดผิดที่ ไม่ใช่เคลื่อนที่จริง — ทิ้งจุดนี้ทั้งอัน
          return prev;
        }

        // ขยับไม่ถึงเกณฑ์ — ถือว่ายังยืนอยู่ที่เดิม "ทิ้ง" จุดนี้ไปเลย ไม่เอามาเป็นจุดอ้างอิงใหม่
        // (ถ้าเอามาอ้างอิงต่อ สัญญาณ GPS/WiFi ที่แกว่งไปมาเรื่อยๆ รอบจุดเดิม จะค่อยๆ "เดินสุ่ม" สะสม
        // ระยะทางทีละนิดได้ทั้งที่ไม่ได้ขยับจริง โดยเฉพาะบนเว็บ/คอมที่ไม่มีชิป GPS จริง ความแม่นยำหยาบกว่ามือถือมาก)
        if (segment <= MIN_SEGMENT_DISTANCE) {
          return prev;
        }

        setDistanceMeters((d) => d + segment);
        lastMovementAtRef.current = Date.now();

        if (typeof last.altitude === "number" && typeof point.altitude === "number") {
          const gain = point.altitude - last.altitude;
          if (gain > MIN_ELEVATION_STEP) {
            setElevationGainMeters((g) => g + gain);
          }
        }
      }

      return [...prev, point];
    });
  };

  const startWatching = async () => {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => {
        // ความแม่นยำแย่เกินไป (ยืนใต้ตึก, สัญญาณเพิ่งเริ่มจับ ฯลฯ) — ข้ามจุดนี้ไปเลย
        // ไม่งั้นจุดที่หลุดไปไกลๆ จะถูกนับเป็นระยะทางจริงและวาดเป็นเส้นบนแผนที่แบบผิดๆ
        const accuracy = location.coords.accuracy;
        if (accuracy != null && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
          return;
        }

        handlePoint({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          altitude: location.coords.altitude,
        });
      }
    );
    watcherRef.current = subscription;
  };

  // โหมดสาธิต — ปล่อยพิกัดจำลองไล่ตามเส้นทางวนรอบ แทนการฟัง GPS จริง ไว้ present ตอนไม่ได้วิ่งจริง
  // ถ้าเรียกตอน resume (ไม่ส่ง origin) จะเดินต่อจากจุดเดิมในเส้นทาง ไม่รีเซ็ตกลับไปจุดเริ่ม
  const startDemoWatching = (origin?: { latitude: number; longitude: number }) => {
    if (origin) {
      demoRouteRef.current = buildDemoRoute(origin);
      demoIndexRef.current = 0;
    }

    demoTimerRef.current = setInterval(() => {
      const route = demoRouteRef.current;
      if (route.length === 0) return;

      const nextPoint = route[demoIndexRef.current % route.length];
      demoIndexRef.current += 1;

      handlePoint({
        latitude: nextPoint.latitude,
        longitude: nextPoint.longitude,
        timestamp: Date.now(),
        altitude: nextPoint.altitude,
      });
    }, DEMO_TICK_INTERVAL_MS);
  };

  const start = async (
    activityType: ActivityType,
    options?: { demo?: boolean; demoOrigin?: { latitude: number; longitude: number } }
  ) => {
    setErrorMsg(null);
    isDemoRef.current = !!options?.demo;
    setIsDemo(!!options?.demo);

    if (!options?.demo) {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        setErrorMsg("ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง");
        Alert.alert("ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง", "ต้องเปิดสิทธิ์ตำแหน่งก่อนเริ่มบันทึก");
        return;
      }
    }

    setPath([]);
    setDistanceMeters(0);
    setElevationGainMeters(0);
    setElapsedSeconds(0);
    accumulatedSecondsRef.current = 0;
    runStartedAtRef.current = new Date().toISOString();
    activityTypeRef.current = activityType;

    try {
      if (options?.demo) {
        startDemoWatching(options.demoOrigin ?? DEMO_FALLBACK_ORIGIN);
      } else {
        await startWatching();
      }
      startTimer();
      setStatus("running");
    } catch {
      setErrorMsg("เริ่มติดตามตำแหน่งไม่สำเร็จ");
    }
  };

  const pause = () => {
    stopWatching();
    stopTimer();
    setStatus("paused");
  };

  const resume = async () => {
    try {
      if (isDemoRef.current) {
        startDemoWatching();
      } else {
        await startWatching();
      }
      startTimer();
      setStatus("running");
    } catch {
      setErrorMsg("ติดตามตำแหน่งต่อไม่สำเร็จ");
    }
  };

  // จบการวิ่ง — คืนค่าสรุปผลให้ผู้เรียกเอาไปบันทึกต่อ (คืน null ถ้าข้อมูลน้อยเกินไปจะบันทึกไม่ได้)
  const stop = (): Omit<Run, "id"> | null => {
    stopWatching();
    stopTimer();
    setStatus("idle");
    isDemoRef.current = false;
    setIsDemo(false);

    const startedAt = runStartedAtRef.current;
    runStartedAtRef.current = null;

    if (!startedAt || path.length < 2) {
      return null;
    }

    return {
      activityType: activityTypeRef.current,
      startedAt,
      endedAt: new Date().toISOString(),
      durationSeconds: Math.round(elapsedSeconds),
      distanceMeters: Math.round(distanceMeters),
      elevationGainMeters: Math.round(elevationGainMeters),
      path,
    };
  };

  const reset = () => {
    setPath([]);
    setDistanceMeters(0);
    setElevationGainMeters(0);
    setElapsedSeconds(0);
    setIsAutoPaused(false);
    setStatus("idle");
    isDemoRef.current = false;
    setIsDemo(false);
  };

  // เผื่อผู้ใช้ออกจากหน้าจอกลางคันระหว่างกำลังวิ่งอยู่ — เคลียร์ subscription/timer ไม่ให้ค้าง
  useEffect(() => {
    return () => {
      stopWatching();
      stopTimer();
    };
  }, []);

  return {
    status,
    path,
    distanceMeters,
    elevationGainMeters,
    elapsedSeconds,
    isAutoPaused,
    isDemo,
    errorMsg,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
