import type {
  Activity,
  Badge,
  CommunityPost,
  LiveMessage,
  LiveSession,
  MealLogEntry,
  Notification,
  ProgressPoint,
  Subscription,
  ShoppingItem,
  User,
  UserBadge,
  UserPreferences,
  WaterLog,
} from '@/types'
import { storage } from '../storage'
import { seedCommunityPosts, seedLeaderboard } from '@/data/community'
import { liveCatalog, seedLiveMessages } from '@/data/lives'
import { seedAnnouncements, seedEvents } from '@/data/events'
import { seedMenu } from '@/data/menu'
import { badgeCatalog } from '@/data/badges'
import { uid, todayKey, daysAgoKey, round } from '@/utils/id'

export const KEYS = {
  users: 'users',
  session: 'session',
  preferences: 'preferences',
  program: 'program',
  nutrition: 'nutrition',
  shopping: 'shopping',
  mealLogs: 'mealLogs',
  water: 'water',
  activities: 'activities',
  steps: 'steps',
  completedWorkouts: 'completedWorkouts',
  participations: 'participations',
  userBadges: 'userBadges',
  posts: 'posts',
  notifications: 'notifications',
  ai: 'ai',
  subscription: 'subscription',
  progress: 'progress',
  liveMessages: 'liveMessages',
  lives: 'lives',
  events: 'events',
  eventAttendance: 'eventAttendance',
  announcements: 'announcements',
  menu: 'menu',
  payments: 'payments',
  dataVersion: 'dataVersion',
}

export function key(name: string, userId?: string): string {
  return userId ? `${name}:${userId}` : name
}

export function getUsers(): User[] {
  return storage.get<User[]>(KEYS.users) ?? []
}

export function saveUsers(users: User[]): void {
  storage.set(KEYS.users, users)
}

export function read<T>(name: string, userId?: string, fallback: T | null = null): T | null {
  return storage.get<T>(key(name, userId)) ?? fallback
}

export function write<T>(name: string, value: T, userId?: string): void {
  storage.set(key(name, userId), value)
}

export function ensureGlobalSeed(): void {
  if (!storage.get<CommunityPost[]>(KEYS.posts)) {
    storage.set(KEYS.posts, seedCommunityPosts)
  }
  if (!storage.get<LiveSession[]>(KEYS.lives)) {
    storage.set(KEYS.lives, liveCatalog)
  }
  if (!storage.get<LiveMessage[]>(KEYS.liveMessages)) {
    storage.set(KEYS.liveMessages, seedLiveMessages)
  }
  if (!storage.get(KEYS.events)) {
    storage.set(KEYS.events, seedEvents)
    storage.set(key(KEYS.eventAttendance, 'u_charly'), ['evt_atelier_nutrition'])
  }
  if (!storage.get(KEYS.announcements)) {
    storage.set(KEYS.announcements, seedAnnouncements)
  }
  if (!storage.get(KEYS.menu)) {
    storage.set(KEYS.menu, seedMenu())
  }
  migrateData()
}

const DATA_VERSION = 3
const EMOJI = /\s?[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{2728}\u{200D}\u{FE0F}]+/gu

/** v3 : historique de paiement du compte démo, cohérent avec son abonnement. */
function seedDemoPayments(): void {
  const k = key(KEYS.payments, 'u_charly')
  if (storage.get(k)) return
  const sub = storage.get<Subscription>(key(KEYS.subscription, 'u_charly'))
  if (!sub) return
  const paidAt = sub.startedAt
  storage.set(k, [
    {
      id: 'pay_demo_1',
      reference: 'FL-DEMO-0001',
      plan: sub.plan,
      billing: sub.billing,
      amount: sub.billing === 'yearly' ? 100000 : 10000,
      currency: 'FCFA',
      method: 'orange_money',
      phoneMasked: '07 •• •• 45',
      status: 'succeeded',
      createdAt: paidAt,
      paidAt,
    },
  ])
  storage.set(key(KEYS.subscription, 'u_charly'), { ...sub, method: sub.method ?? 'orange_money' })
}

/** v2 : retire les emojis des contenus déjà enregistrés dans le navigateur. */
function migrateData(): void {
  const version = storage.get<number>(KEYS.dataVersion) ?? 1
  if (version >= DATA_VERSION) return
  if (version < 3) seedDemoPayments()
  if (version >= 2) {
    storage.set(KEYS.dataVersion, DATA_VERSION)
    return
  }
  const clean = (t: string) => t.replace(EMOJI, '')
  const posts = storage.get<CommunityPost[]>(KEYS.posts) ?? []
  storage.set(
    KEYS.posts,
    posts.map((p) => ({ ...p, content: clean(p.content), comments: p.comments.map((c) => ({ ...c, text: clean(c.text) })) })),
  )
  const messages = storage.get<LiveMessage[]>(KEYS.liveMessages) ?? []
  storage.set(KEYS.liveMessages, messages.map((m) => ({ ...m, text: clean(m.text) })))
  for (const k of storage.keys().filter((k) => k.startsWith(`${KEYS.notifications}:`))) {
    const list = storage.get<Notification[]>(k) ?? []
    storage.set(k, list.map((n) => ({ ...n, title: clean(n.title), body: clean(n.body) })))
  }
  storage.set(KEYS.dataVersion, DATA_VERSION)
}

export function seedUserData(user: User): void {
  const today = todayKey()

  const activities: Activity[] = []
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let d = 29; d >= 0; d--) {
    if (rand() < 0.35) continue
    const type = rand() > 0.75 ? 'run' : rand() > 0.4 ? 'walk' : 'bike'
    const distance = round((type === 'bike' ? 6 + rand() * 10 : 2 + rand() * 6), 2)
    const minutes = Math.round(distance * (type === 'bike' ? 2.6 : type === 'run' ? 6 : 11))
    const started = new Date()
    started.setDate(started.getDate() - d)
    started.setHours(7, Math.round(rand() * 50), 0, 0)
    const finished = new Date(started.getTime() + minutes * 60_000)
    const steps = Math.round((distance * 1000) / 0.75)
    activities.push({
      id: uid('act'),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      type,
      status: 'finished',
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      durationSeconds: minutes * 60,
      movingSeconds: minutes * 60,
      distanceKm: distance,
      steps,
      avgSpeedKmh: round(distance / (minutes / 60)),
      maxSpeedKmh: round(distance / (minutes / 60) * 1.4),
      calories: Math.round(distance * (type === 'bike' ? 30 : type === 'run' ? 62 : 42)),
      route: [],
      reviewStatus: 'validated',
    })
  }
  write(KEYS.activities, activities, user.id)

  const stepsByDay: Record<string, number> = {}
  for (let d = 29; d >= 0; d--) {
    stepsByDay[daysAgoKey(d)] = Math.round(4000 + rand() * 7000)
  }
  stepsByDay[today] = 6482
  write(KEYS.steps, stepsByDay, user.id)

  const water: WaterLog[] = [
    { date: today, ml: 1800 },
    { date: daysAgoKey(1), ml: 2500 },
  ]
  write(KEYS.water, water, user.id)

  const progress: ProgressPoint[] = []
  const startWeight = user.weight
  for (let w = 8; w >= 0; w--) {
    const d = new Date()
    d.setDate(d.getDate() - w * 7)
    progress.push({
      date: d.toISOString(),
      weight: round(startWeight + w * 0.4, 1),
      distanceKm: round(10 + rand() * 20, 1),
      sessions: Math.round(3 + rand() * 3),
      calories: Math.round(1500 + rand() * 800),
      waterMl: Math.round(1800 + rand() * 900),
      steps: Math.round(45000 + rand() * 30000),
      chest: round(95 - w * 0.3, 1),
      waist: round(84 - w * 0.4, 1),
      hips: round(98 - w * 0.3, 1),
    })
  }
  write(KEYS.progress, progress, user.id)

  const emptyMealLogs: MealLogEntry[] = []
  write(KEYS.mealLogs, emptyMealLogs, user.id)

  const earned: UserBadge[] = [
    { badgeId: 'b_first_step', userId: user.id, earnedAt: new Date(Date.now() - 20 * 864e5).toISOString() },
    { badgeId: 'b_5km', userId: user.id, earnedAt: new Date(Date.now() - 15 * 864e5).toISOString() },
    { badgeId: 'b_25km', userId: user.id, earnedAt: new Date(Date.now() - 5 * 864e5).toISOString() },
  ]
  write(KEYS.userBadges, earned, user.id)

  write(KEYS.completedWorkouts, [] as string[], user.id)
  write(KEYS.participations, [], user.id)
  write(KEYS.subscription, null, user.id)
  write(KEYS.ai, [], user.id)
  write(KEYS.shopping, [] as ShoppingItem[], user.id)
  write(KEYS.notifications, seedNotifications(user), user.id)
}

export function seedNotifications(user: User): Notification[] {
  return [
    {
      id: uid('notif'),
      userId: user.id,
      type: 'encouragement',
      title: 'Excellent travail',
      body: `Bravo ${user.firstName}, tu es à 80 % de ton objectif de la semaine !`,
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: uid('notif'),
      userId: user.id,
      type: 'leaderboard',
      title: 'Amina vient de te dépasser',
      body: 'Il te manque 1,2 km pour reprendre la première place !',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      read: false,
    },
    {
      id: uid('notif'),
      userId: user.id,
      type: 'live',
      title: 'Live dans 1h : Full Body',
      body: 'Coach Awa démarre sa séance Full Body dans une heure.',
      createdAt: new Date(Date.now() - 5400_000).toISOString(),
      read: false,
    },
    {
      id: uid('notif'),
      userId: user.id,
      type: 'hydration',
      title: 'N’oublie pas de boire',
      body: 'Tu es à 1,8 L sur 2,5 L aujourd’hui. Encore un petit effort !',
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
      read: true,
    },
  ]
}

export function allBadges(): Badge[] {
  return badgeCatalog
}

export const DEMO_CREDENTIALS = { email: 'demo@fitlife.app', password: 'fitlife' }

/** Comptes supprimés par le super admin : ne jamais les recréer au démarrage. */
export function deletedUserIds(): Set<string> {
  return new Set(storage.get<string[]>('deletedUserIds') ?? [])
}

export function markUserDeleted(id: string): void {
  storage.set('deletedUserIds', [...deletedUserIds(), id])
}

export function ensureDemoUser(): void {
  const users = getUsers()
  if (users.some((u) => u.id === 'u_charly') || deletedUserIds().has('u_charly')) {
    ensureStaffUsers()
    return
  }
  const demo: User = {
    id: 'u_charly',
    firstName: 'Charly',
    lastName: 'DIALLO',
    email: DEMO_CREDENTIALS.email,
    phone: '+225 07 00 00 00',
    birthDate: '1993-05-14',
    sex: 'male',
    height: 180,
    weight: 78,
    role: 'user',
    isPremium: true,
    premiumPlan: 'premium',
    createdAt: new Date(Date.now() - 90 * 864e5).toISOString(),
  }
  saveUsers([...users, demo])
  seedUserData(demo)
  const prefs: UserPreferences = {
    goal: 'weight_loss',
    level: 'intermediate',
    daysPerWeek: 4,
    sessionMinutes: 30,
    equipment: ['none', 'dumbbells', 'mat'],
    favoriteFoods: ['Poulet', 'Riz', 'Banane'],
    avoidedFoods: [],
    allergies: [],
    dietRestrictions: [],
    budget: 'medium',
    mealsPerDay: 4,
    onboarded: true,
  }
  write(KEYS.preferences, prefs, demo.id)
  write(KEYS.subscription, {
    plan: 'premium',
    status: 'active',
    billing: 'monthly',
    startedAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    renewsAt: new Date(Date.now() + 5 * 864e5).toISOString(),
  }, demo.id)

  ensureStaffUsers()
}

function ensureStaffUsers(): void {
  const users = getUsers()
  const deleted = deletedUserIds()

  if (!users.some((u) => u.id === 'u_admin') && !deleted.has('u_admin')) {
    const admin: User = {
      id: 'u_admin',
      firstName: 'Admin',
      lastName: 'FitLife',
      email: 'admin@fitlife.app',
      phone: '+225 01 00 00 00',
      birthDate: '1990-01-01',
      sex: 'male',
      height: 180,
      weight: 80,
      role: 'admin',
      isPremium: true,
      premiumPlan: 'premium',
      createdAt: new Date(Date.now() - 200 * 864e5).toISOString(),
    }
    saveUsers([...getUsers(), admin])
    const pending: Activity[] = [
      {
        id: 'act_pending_speed',
        userId: admin.id,
        type: 'run',
        status: 'finished',
        startedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
        finishedAt: new Date(Date.now() - 3 * 3600_000 + 1800_000).toISOString(),
        durationSeconds: 1800,
        movingSeconds: 1800,
        distanceKm: 24,
        steps: 32000,
        avgSpeedKmh: 48,
        maxSpeedKmh: 68,
        calories: 1400,
        route: [],
        reviewStatus: 'pending',
        reviewReason: 'Vitesse moyenne incohérente (48 km/h).',
      },
      {
        id: 'act_pending_jump',
        userId: admin.id,
        type: 'bike',
        status: 'finished',
        startedAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
        finishedAt: new Date(Date.now() - 26 * 3600_000 + 3600_000).toISOString(),
        durationSeconds: 3600,
        movingSeconds: 3600,
        distanceKm: 9,
        steps: 0,
        avgSpeedKmh: 9,
        maxSpeedKmh: 140,
        calories: 300,
        route: [],
        reviewStatus: 'pending',
        reviewReason: 'Saut GPS anormal détecté (signal suspect).',
      },
      {
        id: 'act_pending_dupe',
        userId: admin.id,
        type: 'walk',
        status: 'finished',
        startedAt: new Date(Date.now() - 40 * 3600_000).toISOString(),
        finishedAt: new Date(Date.now() - 40 * 3600_000 + 4200_000).toISOString(),
        durationSeconds: 4200,
        movingSeconds: 4200,
        distanceKm: 12,
        steps: 16000,
        avgSpeedKmh: 10.3,
        maxSpeedKmh: 12,
        calories: 500,
        route: [],
        reviewStatus: 'pending',
        reviewReason: 'Session en doublon détectée.',
      },
    ]
    write(KEYS.activities, pending, 'u_admin')
    write(KEYS.preferences, {
      goal: 'fitness', level: 'advanced', daysPerWeek: 5, sessionMinutes: 45,
      equipment: ['gym'], favoriteFoods: [], avoidedFoods: [], allergies: [], dietRestrictions: [],
      budget: 'high', mealsPerDay: 4, onboarded: true,
    }, 'u_admin')
  }

  if (!users.some((u) => u.id === 'u_coach') && !deleted.has('u_coach')) {
    const coach: User = {
      id: 'u_coach',
      firstName: 'Coach',
      lastName: 'Awa',
      email: 'coach@fitlife.app',
      phone: '+225 05 00 00 00',
      birthDate: '1988-03-01',
      sex: 'female',
      height: 168,
      weight: 62,
      role: 'coach',
      isPremium: true,
      premiumPlan: 'premium',
      createdAt: new Date(Date.now() - 300 * 864e5).toISOString(),
    }
    saveUsers([...getUsers(), coach])
    write(KEYS.preferences, {
      goal: 'wellness', level: 'advanced', daysPerWeek: 7, sessionMinutes: 60,
      equipment: ['gym'], favoriteFoods: [], avoidedFoods: [], allergies: [], dietRestrictions: [],
      budget: 'high', mealsPerDay: 4, onboarded: true,
    }, 'u_coach')
    write(KEYS.activities, [], 'u_coach')
  }

  // Super administrateur : gère tous les comptes (espace /super-admin)
  if (!getUsers().some((u) => u.id === 'u_superadmin') && !deleted.has('u_superadmin')) {
    const superAdmin: User = {
      id: 'u_superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@fitlife.app',
      phone: '+225 07 07 07 07',
      birthDate: '1987-06-15',
      sex: 'male',
      height: 178,
      weight: 76,
      role: 'superadmin',
      isPremium: true,
      premiumPlan: 'premium',
      createdAt: new Date(Date.now() - 400 * 864e5).toISOString(),
    }
    saveUsers([...getUsers(), superAdmin])
    write(KEYS.preferences, {
      goal: 'fitness', level: 'intermediate', daysPerWeek: 4, sessionMinutes: 45,
      equipment: ['gym'], favoriteFoods: [], avoidedFoods: [], allergies: [], dietRestrictions: [],
      budget: 'high', mealsPerDay: 4, onboarded: true,
    }, 'u_superadmin')
    write(KEYS.activities, [], 'u_superadmin')
  }

  // Membres de démonstration (ceux de la communauté), pour peupler la liste des inscrits
  const members: [string, string, string, User['sex'], number, boolean][] = [
    ['u_amina', 'Amina', 'Touré', 'female', 120, true],
    ['u_koffi', 'Koffi', 'Mensah', 'male', 64, false],
    ['u_fatou', 'Fatou', 'Koné', 'female', 41, true],
    ['u_moussa', 'Moussa', 'Diarra', 'male', 18, false],
    ['u_grace', 'Grace', 'Kouassi', 'female', 6, false],
    ['u_ibrahim', 'Ibrahim', 'Sow', 'male', 1, false],
  ]
  const existing = new Set(getUsers().map((u) => u.id))
  const added: User[] = members
    .filter(([id]) => !existing.has(id) && !deleted.has(id))
    .map(([id, firstName, lastName, sex, daysAgo, premium]) => ({
      id,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}@exemple.com`,
      phone: '',
      birthDate: '1996-01-01',
      sex,
      height: sex === 'female' ? 165 : 176,
      weight: sex === 'female' ? 62 : 74,
      role: 'user' as const,
      isPremium: premium,
      premiumPlan: premium ? ('premium' as const) : undefined,
      createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
    }))
  if (added.length) {
    saveUsers([...getUsers(), ...added])
    for (const m of added) {
      if (m.isPremium) {
        write(KEYS.subscription, {
          plan: 'premium', status: 'active', billing: 'monthly', method: 'orange_money',
          startedAt: new Date(Date.now() - 10 * 864e5).toISOString(),
          renewsAt: new Date(Date.now() + 20 * 864e5).toISOString(),
        }, m.id)
      }
    }
  }
}

/**
 * Démo : les contenus d'exemple (lives, menu, événements) sont datés relativement à « maintenant ».
 * Une fois par jour on les recale, sans toucher à ce que les coachs / admins ont créé eux-mêmes.
 */
function refreshDemoContent(): void {
  const today = todayKey()
  if (storage.get<string>('demoRefreshedOn') === today) return
  const seedLiveIds = new Set(liveCatalog.map((l) => l.id))
  const lives = (storage.get<LiveSession[]>(KEYS.lives) ?? []).filter((l) => !seedLiveIds.has(l.id))
  storage.set(KEYS.lives, [...liveCatalog, ...lives])
  const menu = (storage.get<{ id: string }[]>(KEYS.menu) ?? []).filter((m) => !/^menu_\d+_\d+$/.test(m.id))
  storage.set(KEYS.menu, [...seedMenu(), ...menu])
  const seedEventIds = new Set(seedEvents.map((e) => e.id))
  const previous = new Map((storage.get<{ id: string; attendees: number }[]>(KEYS.events) ?? []).map((e) => [e.id, e]))
  const events = (storage.get<{ id: string }[]>(KEYS.events) ?? []).filter((e) => !seedEventIds.has(e.id))
  storage.set(KEYS.events, [
    ...seedEvents.map((e) => ({ ...e, attendees: previous.get(e.id)?.attendees ?? e.attendees })),
    ...events,
  ])
  storage.set('demoRefreshedOn', today)
}

export function bootstrap(): void {
  ensureGlobalSeed()
  refreshDemoContent()
  ensureDemoUser()
  // Idempotent : ajoute les comptes d'équipe / de démo manquants (ex. super admin ajouté après coup).
  ensureStaffUsers()
}

export { seedLeaderboard }
