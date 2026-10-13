import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Bike,
  Footprints,
  MapPin,
  Pause,
  Play,
  Radio,
  Star,
  Timer,
  TrendingUp,
} from 'lucide-react'
import type { Activity, ActivityType } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useActivity } from '@/context/ActivityContext'
import { Badge, Button, Card, Modal, Spinner, StatCard, Tabs } from '@/components/ui'
import { AreaChartCard } from '@/components/ui/Chart'
import { RouteMap } from '@/components/domain/RouteMap'
import { activityTypeLabels } from '@/utils/labels'
import { formatClock, formatKm, formatNumber, relativeTime } from '@/utils/format'
import { distanceFromSteps } from '@/utils/fitness'
import { todayKey, daysAgoKey } from '@/utils/id'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { activityTypeIcons, TypeIcon } from '@/components/ui'
import { CheckCircle2 } from 'lucide-react'

type Tab = 'podometer' | 'gps' | 'history'

const STEP_GOAL = 10000

const activityIcons: Record<ActivityType, typeof Footprints> = {
  walk: Footprints,
  run: ActivityIcon,
  bike: Bike,
  other: Star,
}

export function ActivityPage() {
  const [tab, setTab] = useState<Tab>('podometer')

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Bouge, ça compte"
        title="Podomètre & Activité"
        subtitle="Compte tes pas ou lance une session GPS et alimente le classement."
        icon={<Footprints size={22} />}
        image={pageHeroes.activity}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'podometer', label: 'Podomètre', icon: <Footprints size={15} /> },
          { value: 'gps', label: 'Session GPS', icon: <MapPin size={15} /> },
          { value: 'history', label: 'Historique', icon: <TrendingUp size={15} /> },
        ]}
      />

      {tab === 'podometer' && <PodometerView />}
      {tab === 'gps' && <GpsView />}
      {tab === 'history' && <HistoryView />}
    </div>
  )
}

function PodometerView() {
  const today = todayKey()
  const { data, loading } = useAsync(async () => {
    const [steps, activities] = await Promise.all([api.getSteps(today), api.getActivities()])
    const week = await Promise.all(
      Array.from({ length: 7 }, (_, i) => api.getSteps(daysAgoKey(6 - i))),
    )
    return { steps, activities, week }
  }, [today])

  if (loading || !data) return <Spinner label="Lecture de tes pas…" />

  const distance = distanceFromSteps(data.steps)
  const calories = Math.round(data.steps * 0.04)
  const minutes = Math.round((data.steps / 100) * 60)
  const pct = Math.round((data.steps / STEP_GOAL) * 100)

  const chartData = data.week.map((v, i) => ({
    label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
    pas: v,
  }))

  return (
    <div className="space-y-5">
      <Card variant="gradient">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Aujourd’hui</p>
            <p className="text-4xl font-extrabold text-white">{formatNumber(data.steps)}</p>
            <p className="text-xs text-white/50">sur {formatNumber(STEP_GOAL)} pas</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-fit/30">
            <span className="text-xl font-extrabold text-fit">{pct}%</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Distance" value={distance.toFixed(2).replace('.', ',')} unit="km" icon={<MapPin size={14} />} />
        <StatCard label="Durée" value={formatClock(minutes)} icon={<Timer size={14} />} />
        <StatCard label="Calories" value={formatNumber(calories)} unit="kcal" icon={<ActivityIcon size={14} />} />
        <StatCard label="Vitesse" value="5,3" unit="km/h" icon={<TrendingUp size={14} />} />
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Cette semaine</h3>
        <AreaChartCard data={chartData} dataKey="pas" unit=" pas" />
      </Card>

      <Card variant="glass" className="text-xs text-white/50">
        Le podomètre utilise les capteurs de mouvement de ton appareil. Dans cette démo, les données
        sont simulées par le service d’activité et mises à jour avec tes sessions GPS.
      </Card>
    </div>
  )
}

function GpsView() {
  const { status, elapsedSeconds, distanceKm, steps, currentSpeedKmh, avgSpeedKmh, calories, route, start, pause, resume, finish, discard, loading, mode, gpsNotice, accuracyM } =
    useActivity()
  const [result, setResult] = useState<{ flagged: boolean; reason?: string; distanceKm: number } | null>(null)
  const [choosing, setChoosing] = useState(false)

  const started = status === 'active' || status === 'paused'

  const handleFinish = async () => {
    const r = await finish()
    if (r) setResult(r)
  }

  if (!started) {
    return (
      <div className="space-y-5">
        <Card variant="gradient" className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-fit/20 text-fit">
            <MapPin size={34} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">Démarre une activité GPS</h2>
          <p className="mt-1 text-sm text-white/60">
            Choisis ton type d’activité, le GPS enregistrera ton parcours en temps réel.
          </p>
          <Button className="mt-5" size="lg" fullWidth onClick={() => setChoosing(true)} loading={loading} leftIcon={<Play size={18} />}>
            {loading ? 'Recherche du signal GPS…' : 'Démarrer une activité'}
          </Button>
          <p className="mt-3 text-[11px] text-white/40">L’app te demandera l’accès à ta position pour enregistrer ton trajet.</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {(['walk', 'run', 'bike', 'other'] as ActivityType[]).map((t) => {
            const Icon = activityIcons[t]
            return (
              <Card key={t} className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-fit/15 text-fit">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-semibold text-white">{activityTypeLabels[t]}</span>
              </Card>
            )
          })}
        </div>

        <Modal open={choosing} onClose={() => setChoosing(false)} title="Type d’activité">
          <div className="grid grid-cols-2 gap-3">
            {(['walk', 'run', 'bike', 'other'] as ActivityType[]).map((t) => {
              const Icon = activityIcons[t]
              return (
                <button
                  key={t}
                  onClick={async () => {
                    setChoosing(false)
                    await start(t)
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 py-5 transition hover:border-fit/40"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fit/15 text-fit">
                    <TypeIcon icon={activityTypeIcons[t]} size={22} />
                  </span>
                  <span className="text-sm font-semibold text-white">{activityTypeLabels[t]}</span>
                  <Icon size={14} className="text-white/30" />
                </button>
              )
            })}
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {mode === 'gps' ? (
        <div className="flex items-center gap-2 rounded-2xl border border-fit/25 bg-fit/10 px-3 py-2 text-xs text-white/75">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fit opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fit" />
          </span>
          GPS actif{accuracyM !== null && ` · précision ±${accuracyM} m`}
          {gpsNotice && <span className="text-amber-300"> · {gpsNotice}</span>}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
          {gpsNotice ?? 'Trajet simulé (démo).'}
        </div>
      )}
      <RouteMap points={route} live={status === 'active'} />

      <Card variant="gradient" className="text-center">
        <p className="text-xs uppercase tracking-wide text-white/50">
          {status === 'paused' ? 'En pause' : 'En cours'}
        </p>
        <p className="text-5xl font-extrabold tabular-nums text-white">{formatClock(elapsedSeconds)}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Distance" value={distanceKm.toFixed(2).replace('.', ',')} unit="km" icon={<MapPin size={14} />} />
        <StatCard label="Pas" value={formatNumber(steps)} icon={<Footprints size={14} />} />
        <StatCard label="Vitesse" value={currentSpeedKmh.toFixed(1).replace('.', ',')} unit="km/h" icon={<TrendingUp size={14} />} />
        <StatCard label="Vitesse moy." value={avgSpeedKmh.toFixed(1).replace('.', ',')} unit="km/h" icon={<ActivityIcon size={14} />} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {status === 'active' ? (
          <Button variant="secondary" size="lg" onClick={pause} leftIcon={<Pause size={18} />}>
            PAUSE
          </Button>
        ) : (
          <Button variant="secondary" size="lg" onClick={resume} leftIcon={<Play size={18} />}>
            REPRENDRE
          </Button>
        )}
        <Button variant="danger" size="lg" onClick={handleFinish} leftIcon={<Radio size={18} />}>
          TERMINER
        </Button>
      </div>
      <Button variant="ghost" fullWidth onClick={() => void discard()}>
        Abandonner la session
      </Button>
      {loading && <p className="text-center text-xs text-white/40">Traitement…</p>}

      <Modal open={!!result} onClose={() => setResult(null)} title="Session terminée !">
        {result && (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-fit/15 text-fit">
              {result.flagged ? <AlertTriangle size={34} className="text-amber-300" /> : <CheckCircle2 size={36} />}
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              <StatCard label="Distance" value={result.distanceKm.toFixed(2).replace('.', ',')} unit="km" icon={<MapPin size={14} />} />
              <StatCard label="Calories" value={formatNumber(calories)} unit="kcal" icon={<ActivityIcon size={14} />} />
            </div>
            {result.flagged ? (
              <Card className="flex items-start gap-2 border-amber-400/30 bg-amber-400/10 text-left">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="text-xs text-amber-100">
                  Activité soumise à vérification : {result.reason}. Elle n’est pas encore intégrée au
                  classement.
                </p>
              </Card>
            ) : (
              <p className="text-sm text-fit">
                Activité validée et ajoutée au classement.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function HistoryView() {
  const { data, loading } = useAsync(() => api.getActivities(), [])
  const [filter, setFilter] = useState<'all' | ActivityType>('all')

  const filtered = useMemo(
    () => (data ?? []).filter((a) => a.status === 'finished' && (filter === 'all' || a.type === filter)),
    [data, filter],
  )

  if (loading || !data) return <Spinner label="Chargement de ton historique…" />

  const totals = filtered.reduce(
    (acc, a) => ({ km: acc.km + a.distanceKm, steps: acc.steps + a.steps, cal: acc.cal + a.calories }),
    { km: 0, steps: 0, cal: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Distance" value={totals.km.toFixed(1).replace('.', ',')} unit="km" />
        <StatCard label="Pas" value={formatNumber(totals.steps)} />
        <StatCard label="Calories" value={formatNumber(totals.cal)} unit="kcal" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'walk', 'run', 'bike', 'other'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
              filter === f ? 'border-fit bg-fit text-ink-900' : 'border-white/10 bg-ink-700 text-white/60'
            }`}
          >
            {f === 'all' ? 'Tout' : activityTypeLabels[f]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <Card className="text-center text-sm text-white/50">Aucune activité.</Card>}
        {filtered.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </div>
    </div>
  )
}

function ActivityRow({ activity }: { activity: Activity }) {
  const reviewTone =
    activity.reviewStatus === 'validated' ? 'fit' : activity.reviewStatus === 'pending' ? 'amber' : 'red'
  const reviewLabel =
    activity.reviewStatus === 'validated' ? 'Validée' : activity.reviewStatus === 'pending' ? 'Vérification' : 'Rejetée'

  return (
    <Card className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fit/15 text-fit">
        <TypeIcon icon={activityTypeIcons[activity.type]} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{activityTypeLabels[activity.type]}</p>
        <p className="text-xs text-white/50">
          {relativeTime(activity.startedAt)} · {formatClock(activity.durationSeconds)} ·{' '}
          {formatNumber(activity.steps)} pas
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-white">{formatKm(activity.distanceKm)}</p>
        <Badge tone={reviewTone}>{reviewLabel}</Badge>
      </div>
    </Card>
  )
}

export function ActivityListPage() {
  return <ActivityPage />
}
