import type { Announcement, FitEvent } from '@/types'
import { img } from './images'

function at(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const created = new Date(Date.now() - 3 * 864e5).toISOString()

export const seedEvents: FitEvent[] = [
  {
    id: 'evt_run_lagune',
    title: 'Course collective du samedi',
    description:
      'Footing de 6 km à allure libre, trois groupes de niveau. Échauffement guidé par Coach Koffi, étirements et collation offerte à l’arrivée.',
    category: 'run',
    startsAt: at(3, 7, 0),
    durationMinutes: 90,
    location: 'Boulevard de la Lagune, Cocody',
    online: false,
    capacity: 60,
    attendees: 38,
    attending: false,
    coverUrl: img('photo-1590333748338-d629e4564ad9', 900, 500),
    createdBy: 'Coach Koffi',
    createdAt: created,
    updatedAt: created,
  },
  {
    id: 'evt_atelier_nutrition',
    title: 'Atelier : préparer ses repas de la semaine',
    description:
      'Coach Amina te montre comment préparer 5 déjeuners équilibrés en 1 h 30, avec des produits du marché et un petit budget.',
    category: 'workshop',
    startsAt: at(6, 18, 30),
    durationMinutes: 90,
    location: 'Live FitLife',
    online: true,
    capacity: null,
    attendees: 214,
    attending: true,
    coverUrl: img('photo-1665332111329-dd9d7fa46c74', 900, 500),
    createdBy: 'Coach Amina',
    createdAt: created,
    updatedAt: created,
  },
  {
    id: 'evt_bootcamp',
    title: 'Bootcamp plein air',
    description: 'Circuit training en équipe : 45 minutes intenses, tous niveaux. Pense à ta gourde et à ton tapis.',
    category: 'meetup',
    startsAt: at(10, 8, 0),
    durationMinutes: 60,
    location: 'Parc des Sports, Treichville',
    online: false,
    capacity: 40,
    attendees: 40,
    attending: false,
    coverUrl: img('photo-1596079306903-9164c205f400', 900, 500),
    createdBy: 'Coach David',
    createdAt: created,
    updatedAt: created,
  },
]

export const seedAnnouncements: Announcement[] = [
  {
    id: 'ann_planning',
    title: 'Nouveau planning des lives',
    content:
      'À partir de lundi, les lives Full Body passent à 6 h 30 et 19 h. Les replays restent disponibles 7 jours dans l’onglet Lives.',
    priority: 'important',
    pinned: true,
    expiresAt: null,
    authorName: 'Coach Awa',
    authorRole: 'coach',
    createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600e3).toISOString(),
  },
  {
    id: 'ann_defi',
    title: 'Défi 100 km : dernière ligne droite',
    content: 'Il reste 20 jours pour boucler le défi du mois. Les 10 premiers recevront un t-shirt FitLife.',
    priority: 'info',
    pinned: false,
    expiresAt: new Date(Date.now() + 20 * 864e5).toISOString(),
    authorName: 'Équipe FitLife',
    authorRole: 'admin',
    createdAt: new Date(Date.now() - 864e5).toISOString(),
    updatedAt: new Date(Date.now() - 864e5).toISOString(),
  },
]
