import { Link, useNavigate } from 'react-router-dom'
import {
  Apple,
  ChevronRight,
  Droplets,
  Flame,
  MapPin,
  MessageCircle,
  Radio,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import type { Announcement, Challenge, ChallengeParticipation, FitEvent, LiveSession, NutritionPlan, WorkoutProgram } from '@/types'
import { AnnouncementStrip } from '@/components/domain/AnnouncementStrip'
import { EventCard } from '@/components/domain/EventCard'
import { CalendarDays } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarStack, Badge, Button, Card, ProgressBar, ProgressRing, Spinner, StatCard } from '@/components/ui'
import { challengeImage, heroImages, pageHeroes } from '@/data/images'
import { WorkoutCard } from '@/components/domain/WorkoutCard'
import { MealCard } from '@/components/domain/MealCard'
import { LiveCard } from '@/components/domain/LiveCard'
import { goalLabels } from '@/utils/labels'
import { formatClock, formatKm, formatNumber } from '@/utils/format'
import { distanceFromSteps } from '@/utils/fitness'
import { todayKey } from '@/utils/id'
import { challengeIcon, goalIcons, TypeIcon } from '@/components/ui'
import { Moon, Sun, Sunset } from 'lucide-react'

const STEP_GOAL = 10000

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Encore debout'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function GreetingIcon() {
  const h = new Date().getHours()
  const Icon = h >= 5 && h < 12 ? Sun : h < 18 ? Sunset : Moon
  return <Icon size={15} className="inline -mt-0.5 text-amber-300" />
}

function motivation(progress: number): string {
  if (progress === 0) return 'Aujourd’hui, on pose la première pierre.'
  if (progress < 30) return 'Beau départ, garde ce rythme !'
  if (progress < 70) return 'Tu es en plein dans le dur, et ça paie.'
  if (progress < 100) return 'La ligne d’arrivée est en vue'
  return 'Programme bouclé. Quelle régularité !'
}

const coachTips = [
  { coach: 'Coach Awa', text: 'Pas besoin d’une heure : 20 minutes bien faites valent mieux qu’une séance repoussée à demain.' },
  { coach: 'Coach Amina', text: 'Bois un grand verre d’eau dès le réveil. Ton corps vient de passer 8 heures sans hydratation.' },
  { coach: 'Coach Koffi', text: 'Sur le cardio, si tu peux encore parler en courant, tu es dans la bonne zone pour brûler des graisses.' },
  { coach: 'Coach David', text: 'Le muscle se construit au repos. Dormir 7 h, c’est aussi faire partie de l’entraînement.' },
  { coach: 'Coach Amina', text: 'Remplis la moitié de ton assiette de légumes avant de servir le reste. Simple et redoutable.' },
  { coach: 'Coach Awa', text: 'Les jours sans motivation, enfile juste ta tenue. Le plus souvent, la séance suit toute seule.' },
  { coach: 'Coach Koffi', text: '10 minutes de marche après le repas aident vraiment la digestion et la glycémie.' },
]

interface HomeData {
  program: WorkoutProgram
  nutrition: NutritionPlan
  steps: number
  lives: LiveSession[]
  challenges: Challenge[]
  participations: ChallengeParticipation[]
  announcements: Announcement[]
  events: FitEvent[]
}

export function HomePage() {
  const { user, preferences } = useAuth()
  const navigate = useNavigate()

  const { data, loading } = useAsync<HomeData>(async () => {
    const [program, nutrition, steps, lives, challenges, participations, announcements, events] = await Promise.all([
      api.getProgram(),
      api.getNutritionPlan(),
      api.getSteps(todayKey()),
      api.getLives(),
      api.getChallenges(),
      api.getParticipations(),
      api.getAnnouncements(),
      api.getEvents(),
    ])
    return { program, nutrition, steps, lives, challenges, participations, announcements, events }
  }, [])

  if (loading || !data) return <Spinner label="Préparation de ta journée…" />

  const { program, nutrition, steps, lives, challenges, participations } = data
  const todayWorkout = program.weeks[program.currentWeek - 1]?.workouts[0]
  const dayIndex = (new Date().getDay() + 6) % 7
  const todayMeals = nutrition.week[dayIndex]?.meals ?? []
  const upcomingLives = lives.filter((l) => l.status !== 'ended').slice(0, 3)
  const liveNow = lives.find((l) => l.status === 'live')
  const stepDistance = distanceFromSteps(steps)
  const stepCalories = Math.round(steps * 0.04)
  const stepDuration = Math.round((steps / 100) * 60)
  const joined = new Set(participations.map((p) => p.challengeId))
  const todayChallenge = challenges.find((c) => !joined.has(c.id)) ?? challenges[0]
  const tip = coachTips[new Date().getDate() % coachTips.length]
  const upcomingEvents = data.events.filter((e) => new Date(e.startsAt).getTime() > Date.now())

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bandeau d'accueil : salutation + objectif */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/5">
        <img
          src={heroImages.home}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[70%_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-ink-900/20" />
        <div className="relative flex items-end justify-between gap-4 p-5 sm:p-7">
          <div className="min-w-0 max-w-md">
            <p className="text-sm font-medium text-white/70">
              {greeting()}, {user?.firstName} <GreetingIcon />
            </p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
              {motivation(program.progress)}
            </h1>
            <div className="mt-4 inline-flex flex-wrap items-center gap-2">
              <Badge tone="fit" dot>
                <TypeIcon icon={goalIcons[preferences?.goal ?? 'fitness']} size={12} />
                {goalLabels[preferences?.goal ?? 'fitness']}
              </Badge>
              <span className="text-xs text-white/60">
                Semaine {program.currentWeek} / {program.durationWeeks} · {program.daysPerWeek} séances / sem.
              </span>
            </div>
            <div className="mt-3 max-w-xs">
              <ProgressBar value={program.progress} />
            </div>
            <Button className="mt-5" onClick={() => navigate('/program')} rightIcon={<ChevronRight size={16} />}>
              Voir mon programme
            </Button>
          </div>
          <div className="hidden shrink-0 rounded-full bg-ink-900/60 p-2 backdrop-blur-md sm:block">
            <ProgressRing value={program.progress} size={112} stroke={9}>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-white">{program.progress}%</p>
                <p className="text-[10px] text-white/60">du programme</p>
              </div>
            </ProgressRing>
          </div>
        </div>
      </section>

      {/* Annonces des coachs / de l'équipe */}
      <AnnouncementStrip announcements={data.announcements.slice(0, 4)} />

      {/* Séance du jour */}
      {todayWorkout && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Ta séance du jour</h2>
            <Link to="/program" className="text-xs font-semibold text-fit">
              Tout voir
            </Link>
          </div>
          <WorkoutCard featured workout={todayWorkout} onClick={() => navigate(`/workout/${todayWorkout.id}`)} />
        </section>
      )}

      {/* Mot du coach */}
      <Card className="flex items-start gap-4">
        <Avatar name={tip.coach} size="lg" online />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            {tip.coach}
            <span className="rounded-full bg-fit/15 px-2 py-0.5 text-[10px] font-semibold text-fit">Conseil du jour</span>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">« {tip.text} »</p>
          <Link to="/coach" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fit">
            <MessageCircle size={13} /> Poser une question à ton coach
          </Link>
        </div>
      </Card>

      {/* Accès rapides */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: '/nutrition', label: 'Nutrition', sub: 'Plan du jour', icon: Apple, image: heroImages.nutrition },
          { to: '/activity', label: 'Podomètre', sub: 'Pas & GPS', icon: MapPin, image: pageHeroes.activity },
          { to: '/lives', label: 'Lives', sub: 'En direct', icon: Radio, image: pageHeroes.lives },
          { to: '/challenges', label: 'Défis', sub: 'Relève-les', icon: Target, image: pageHeroes.challenges },
        ].map(({ to, label, sub, icon: Icon, image }) => (
          <Link
            key={to}
            to={to}
            className="group relative isolate flex h-28 flex-col justify-end overflow-hidden rounded-3xl border border-white/[0.07] p-3.5"
          >
            <img
              src={image}
              alt=""
              loading="lazy"
              className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-900 via-ink-900/60 to-ink-900/10" />
            <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-fit/90 text-ink-900 shadow-fit transition group-hover:scale-110">
              <Icon size={16} />
            </span>
            <span className="font-display text-sm font-bold text-white">{label}</span>
            <span className="text-[11px] text-white/60">{sub}</span>
          </Link>
        ))}
      </section>

      {/* Pas */}
      <section>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <MapPin size={18} className="text-fit" /> Mes pas aujourd’hui
              </h2>
              <p className="mt-1 text-sm text-white/50">
                {formatNumber(steps)} / {formatNumber(STEP_GOAL)} pas
              </p>
            </div>
            <ProgressRing value={steps} max={STEP_GOAL} size={84} stroke={8}>
              <span className="text-sm font-extrabold text-fit">
                {Math.round((steps / STEP_GOAL) * 100)}%
              </span>
            </ProgressRing>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard label="Distance" value={formatKm(stepDistance).replace(' km', '')} unit="km" icon={<MapPin size={14} />} />
            <StatCard label="Durée" value={formatClock(stepDuration)} icon={<Flame size={14} />} />
            <StatCard label="Calories" value={formatNumber(stepCalories)} unit="kcal" icon={<Flame size={14} />} />
          </div>
          <Button fullWidth variant="secondary" className="mt-4" onClick={() => navigate('/activity')}>
            Ouvrir le podomètre & GPS
          </Button>
        </Card>
      </section>

      {/* Repas du jour */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Apple size={18} className="text-fit" /> Repas du jour
          </h2>
          <Link to="/nutrition" className="text-xs font-semibold text-fit">
            Mon alimentation
          </Link>
        </div>
        <div className="space-y-3">
          {todayMeals.slice(0, 2).map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
        <Link to="/hydration" className="mt-3 block">
          <Card className="flex items-center gap-3">
            <Droplets className="text-sky-400" size={22} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Hydratation</p>
              <p className="text-xs text-white/50">Objectif {nutrition.hydrationTarget.toString().replace('.', ',')} L / jour</p>
            </div>
            <ChevronRight size={18} className="text-white/40" />
          </Card>
        </Link>
      </section>

      {/* Lives */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Radio size={18} className="text-fit" /> Lives à venir
          </h2>
          <Link to="/lives" className="text-xs font-semibold text-fit">
            Voir les lives
          </Link>
        </div>
        {liveNow && (
          <Link to={`/lives/${liveNow.id}`} className="mb-3 block">
            <Card className="flex items-center gap-3 border-red-500/30 bg-red-500/10">
              <Avatar name={liveNow.coachName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px]">
                    LIVE
                  </span>
                  {liveNow.title}
                </p>
                <p className="truncate text-xs text-white/60">
                  {liveNow.coachName} · {formatNumber(liveNow.viewers)} spectateurs
                </p>
              </div>
              <ChevronRight size={18} className="text-white/40" />
            </Card>
          </Link>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {upcomingLives.slice(0, 2).map((live) => (
            <LiveCard key={live.id} live={live} onClick={() => navigate(`/lives/${live.id}`)} />
          ))}
        </div>
      </section>

      {/* Prochains événements */}
      {upcomingEvents.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <CalendarDays size={18} className="text-fit" /> Prochains événements
            </h2>
            <Link to="/events" className="text-xs font-semibold text-fit">
              Voir l’agenda
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingEvents.slice(0, 2).map((event) => (
              <Link key={event.id} to="/events" className="block">
                <EventCard event={event} compact />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Défi du jour */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Target size={18} className="text-fit" /> Défi du jour
          </h2>
          <Link to="/challenges" className="text-xs font-semibold text-fit">
            Tous les défis
          </Link>
        </div>
        <Card padding="sm" className="flex items-center gap-4">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl">
            <img src={challengeImage(todayChallenge.id, 240)} alt="" className="h-full w-full object-cover" />
            <span className="absolute bottom-1 left-1 grid h-7 w-7 place-items-center rounded-xl bg-ink-900/70 text-fit backdrop-blur">
              <TypeIcon icon={challengeIcon(todayChallenge.id)} size={14} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">{todayChallenge.title}</p>
            <p className="text-xs text-white/50">{todayChallenge.description}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <AvatarStack names={['Grace', 'Ibrahim', 'Nadia']} max={3} />
              <p className="inline-flex items-center gap-1 text-[11px] text-white/40">
                <Users size={11} /> {formatNumber(todayChallenge.participants)}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/challenges')}>
            Participer
          </Button>
        </Card>
      </section>

      {/* Communauté + classement */}
      <Link to="/community" className="block">
        <section className="group relative overflow-hidden rounded-3xl border border-white/5">
          <img
            src={heroImages.community}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/80 to-ink-900/30" />
          <div className="relative flex items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <AvatarStack names={['Amina', 'Koffi', 'Fatou', 'Moussa', 'Yawa']} max={5} />
              <p className="mt-3 text-base font-bold text-white">Tu n’es pas seul·e dans l’aventure</p>
              <p className="mt-0.5 text-xs text-white/65">
                Amina vient de terminer sa 4e semaine, Fatou a couru son premier 10 km. Viens les encourager
              </p>
            </div>
            <ChevronRight size={20} className="text-white/60" />
          </div>
        </section>
      </Link>

      <Link to="/leaderboard" className="block">
        <Card variant="gradient" className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fit/15">
            <Trophy className="text-fit" size={22} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Alimente le classement</p>
            <p className="text-xs text-white/60">
              Chaque activité validée compte. Pars courir et grimpe les places
            </p>
          </div>
          <ChevronRight size={18} className="text-white/40" />
        </Card>
      </Link>

      <p className="pb-2 text-center text-[11px] text-white/30">
        {stepDistance > 0 && `Encore ${formatNumber(Math.max(0, STEP_GOAL - steps))} pas pour atteindre ton objectif`}
      </p>
    </div>
  )
}
