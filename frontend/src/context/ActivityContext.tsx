import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Activity, ActivityType, GpsPoint } from '@/types'
import { api } from '@/services'
import { haversineKm } from '@/utils/antiCheat'
import { caloriesFromActivity, estimateStepsFromDistance } from '@/utils/fitness'
import { round } from '@/utils/id'
import { useAuth } from './AuthContext'

/** gps : vraie géolocalisation · simulation : appareil sans GPS / permission refusée (démo). */
export type TrackingMode = 'gps' | 'simulation'

interface ActivityContextValue {
  activity: Activity | null
  status: Activity['status'] | 'idle'
  elapsedSeconds: number
  distanceKm: number
  steps: number
  currentSpeedKmh: number
  avgSpeedKmh: number
  calories: number
  route: GpsPoint[]
  currentPosition: GpsPoint | null
  loading: boolean
  mode: TrackingMode | null
  /** Raison du passage en simulation (GPS refusé, indisponible…). */
  gpsNotice: string | null
  /** Précision du dernier point GPS, en mètres. */
  accuracyM: number | null
  start: (type: ActivityType) => Promise<void>
  pause: () => void
  resume: () => void
  finish: () => Promise<{ flagged: boolean; reason?: string; distanceKm: number } | null>
  discard: () => Promise<void>
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined)

const BASE = { lat: 5.3599, lng: -4.0083 }
/** Points GPS trop imprécis ignorés (m). */
const MAX_ACCURACY_M = 35
/** Déplacements plus petits ignorés : bruit GPS à l'arrêt (m). */
const MIN_STEP_M = 4
/** Vitesse maximale plausible entre deux points (km/h), au-delà : saut GPS ignoré. */
const MAX_JUMP_KMH: Record<ActivityType, number> = { walk: 15, run: 30, bike: 70, other: 70 }

function simulatedNext(prev: GpsPoint, type: ActivityType, heading: number): GpsPoint {
  const metersPerSecond = type === 'bike' ? 5 : type === 'run' ? 2.8 : type === 'walk' ? 1.4 : 2
  const dLat = (metersPerSecond * Math.cos(heading)) / 111320
  const dLng = (metersPerSecond * Math.sin(heading)) / (111320 * Math.cos((prev.lat * Math.PI) / 180))
  return { lat: prev.lat + dLat, lng: prev.lng + dLng, timestamp: Date.now(), speed: metersPerSecond * 3.6 }
}

function geoErrorMessage(err: GeolocationPositionError | null): string {
  if (!err) return 'GPS indisponible sur cet appareil : trajet simulé (démo).'
  if (err.code === err.PERMISSION_DENIED) return 'Accès à la position refusé : active la localisation pour enregistrer ton vrai trajet. Trajet simulé (démo).'
  if (err.code === err.TIMEOUT) return 'Signal GPS trop faible : trajet simulé (démo). Réessaie à l’extérieur.'
  return 'Position introuvable : trajet simulé (démo).'
}

function firstFix(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(null)
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 })
  })
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [elapsedSeconds, setElapsed] = useState(0)
  const [distanceKm, setDistance] = useState(0)
  const [route, setRoute] = useState<GpsPoint[]>([])
  const [currentPosition, setCurrentPosition] = useState<GpsPoint | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentSpeedKmh, setCurrentSpeed] = useState(0)
  const [mode, setMode] = useState<TrackingMode | null>(null)
  const [gpsNotice, setGpsNotice] = useState<string | null>(null)
  const [accuracyM, setAccuracy] = useState<number | null>(null)

  const clockRef = useRef<number | null>(null)
  const watchRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)
  const distanceRef = useRef(0)
  const routeRef = useRef<GpsPoint[]>([])
  const activityRef = useRef<Activity | null>(null)
  const modeRef = useRef<TrackingMode | null>(null)
  const headingRef = useRef(Math.random() * Math.PI * 2)

  const weight = user?.weight ?? 75
  const steps = estimateStepsFromDistance(distanceKm)
  const avgSpeedKmh = elapsedSeconds > 0 ? round(distanceKm / (elapsedSeconds / 3600), 1) : 0
  const calories = activity ? caloriesFromActivity(distanceKm, weight, activity.type) : 0

  /** Ajoute un point au trajet s'il est plausible (filtres anti-bruit pour le vrai GPS uniquement). */
  const addPoint = useCallback((point: GpsPoint, filtered = true) => {
    const last = routeRef.current[routeRef.current.length - 1]
    setCurrentPosition(point)
    if (!last) {
      routeRef.current = [point]
      setRoute(routeRef.current)
      return
    }
    const segKm = haversineKm(last.lat, last.lng, point.lat, point.lng)
    const hours = Math.max(1, point.timestamp - last.timestamp) / 3600e3
    const type = activityRef.current?.type ?? 'walk'
    if (filtered && segKm * 1000 < MIN_STEP_M) {
      setCurrentSpeed(0)
      return
    }
    if (filtered && segKm / hours > MAX_JUMP_KMH[type]) return // saut GPS
    routeRef.current = [...routeRef.current, { ...point, speed: point.speed || round(segKm / hours, 1) }]
    distanceRef.current = round(distanceRef.current + segKm, 3)
    setRoute(routeRef.current)
    setDistance(distanceRef.current)
    setCurrentSpeed(round(point.speed || segKm / hours, 1))
  }, [])

  const stopTracking = useCallback(() => {
    if (clockRef.current !== null) {
      window.clearInterval(clockRef.current)
      clockRef.current = null
    }
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }, [])

  const startTracking = useCallback(() => {
    stopTracking()
    // Chronomètre (et, en simulation, un point toutes les secondes)
    clockRef.current = window.setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (modeRef.current === 'simulation') {
        const last = routeRef.current[routeRef.current.length - 1]
        if (!last) return
        headingRef.current += (Math.random() - 0.5) * 0.5 // trajet fluide, sans zigzag
        addPoint(simulatedNext(last, activityRef.current?.type ?? 'walk', headingRef.current), false)
      }
    }, 1000)
    if (modeRef.current === 'gps') {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setAccuracy(Math.round(pos.coords.accuracy))
          if (pos.coords.accuracy > MAX_ACCURACY_M) return
          addPoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: pos.timestamp,
            speed: pos.coords.speed != null && pos.coords.speed >= 0 ? round(pos.coords.speed * 3.6, 1) : 0,
          })
        },
        () => setGpsNotice('Signal GPS perdu… le trajet reprendra dès que la position revient.'),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
      )
    }
  }, [stopTracking, addPoint])

  const reset = useCallback(() => {
    setActivity(null)
    activityRef.current = null
    routeRef.current = []
    distanceRef.current = 0
    elapsedRef.current = 0
    setRoute([])
    setDistance(0)
    setElapsed(0)
    setCurrentPosition(null)
    setCurrentSpeed(0)
    setAccuracy(null)
    setMode(null)
    modeRef.current = null
    setGpsNotice(null)
  }, [])

  const start = useCallback(
    async (type: ActivityType) => {
      setLoading(true)
      try {
        let first: GpsPoint
        let nextMode: TrackingMode = 'gps'
        let notice: string | null = null
        try {
          const pos = await firstFix()
          first = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp, speed: 0 }
          setAccuracy(Math.round(pos.coords.accuracy))
        } catch (err) {
          nextMode = 'simulation'
          // (pas d'instanceof GeolocationPositionError : absent de certaines WebView Android)
          notice = geoErrorMessage(err && typeof err === 'object' && 'code' in err ? (err as GeolocationPositionError) : null)
          first = { ...BASE, timestamp: Date.now(), speed: 0 }
        }
        const created = await api.startActivity({ type })
        activityRef.current = created
        setActivity(created)
        modeRef.current = nextMode
        setMode(nextMode)
        setGpsNotice(notice)
        routeRef.current = [first]
        distanceRef.current = 0
        elapsedRef.current = 0
        setRoute([first])
        setCurrentPosition(first)
        setDistance(0)
        setElapsed(0)
        startTracking()
      } finally {
        setLoading(false)
      }
    },
    [startTracking],
  )

  const snapshot = () => ({
    route: routeRef.current,
    distanceKm: distanceRef.current,
    steps: estimateStepsFromDistance(distanceRef.current),
    durationSeconds: elapsedRef.current,
    movingSeconds: elapsedRef.current,
  })

  const pause = useCallback(() => {
    stopTracking()
    setActivity((prev) => (prev ? { ...prev, status: 'paused' } : prev))
    if (activityRef.current) void api.updateActivity(activityRef.current.id, { status: 'paused', ...snapshot() })
  }, [stopTracking])

  const resume = useCallback(() => {
    setActivity((prev) => (prev ? { ...prev, status: 'active' } : prev))
    if (activityRef.current) void api.updateActivity(activityRef.current.id, { status: 'active' })
    startTracking()
  }, [startTracking])

  const finish = useCallback(async () => {
    stopTracking()
    const current = activityRef.current
    if (!current) return null
    await api.updateActivity(current.id, {
      ...snapshot(),
      maxSpeedKmh: Math.max(...routeRef.current.map((p) => p.speed), 0),
      calories: caloriesFromActivity(distanceRef.current, weight, current.type),
    })
    const result = await api.finishActivity(current.id)
    const distance = distanceRef.current
    reset()
    return { flagged: result.flagged, reason: result.reason, distanceKm: distance }
  }, [stopTracking, weight, reset])

  const discard = useCallback(async () => {
    stopTracking()
    const current = activityRef.current
    reset()
    if (current) {
      try {
        await api.cancelActivity(current.id)
      } catch {
        /* déjà supprimée */
      }
    }
  }, [stopTracking, reset])

  useEffect(() => () => stopTracking(), [stopTracking])

  return (
    <ActivityContext.Provider
      value={{
        activity,
        status: activity?.status ?? 'idle',
        elapsedSeconds,
        distanceKm,
        steps,
        currentSpeedKmh,
        avgSpeedKmh,
        calories,
        route,
        currentPosition,
        loading,
        mode,
        gpsNotice,
        accuracyM,
        start,
        pause,
        resume,
        finish,
        discard,
      }}
    >
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity doit être utilisé dans ActivityProvider')
  return ctx
}
