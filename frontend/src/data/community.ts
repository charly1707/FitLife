import type { CommunityPost } from '@/types'
import type { LeaderboardEntry } from '@/types'

function iso(hoursAgo: number): string {
  const d = new Date()
  d.setHours(d.getHours() - hoursAgo)
  return d.toISOString()
}

export const seedCommunityPosts: CommunityPost[] = [
  {
    id: 'post_1',
    userId: 'u_charly',
    userName: 'Charly',
    content: 'Séance du jour terminée ! Les jambes en feu mais tellement fier',
    createdAt: iso(2),
    likes: 48,
    likedByMe: false,
    activitySummary: { distanceKm: 12.6, type: 'run' },
    comments: [
      { id: 'c_1', postId: 'post_1', userId: 'u_amina', userName: 'Amina', text: 'Bravo !', createdAt: iso(1.8) },
      { id: 'c_2', postId: 'post_1', userId: 'u_koffi', userName: 'Koffi', text: 'Belle perf !', createdAt: iso(1.5) },
    ],
  },
  {
    id: 'post_2',
    userId: 'u_amina',
    userName: 'Amina',
    content: '4e semaine du programme terminée. Le plus dur c’est de commencer, après on y prend goût',
    createdAt: iso(6),
    likes: 76,
    likedByMe: true,
    comments: [
      { id: 'c_3', postId: 'post_2', userId: 'u_fatou', userName: 'Fatou', text: 'Inspirante !', createdAt: iso(5.5) },
    ],
  },
  {
    id: 'post_3',
    userId: 'u_fatou',
    userName: 'Fatou',
    content: 'Premier 10 km de ma vie ce matin Objectif atteint !',
    createdAt: iso(20),
    likes: 132,
    likedByMe: false,
    activitySummary: { distanceKm: 10, type: 'run' },
    comments: [],
  },
  {
    id: 'post_4',
    userId: 'u_koffi',
    userName: 'Koffi',
    content: 'Nouveau menu de la semaine ajouté dans mon appli, hâte de tester',
    createdAt: iso(30),
    likes: 21,
    likedByMe: false,
    comments: [],
  },
]

export const seedLeaderboard: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
  { userId: 'u_amina', name: 'Amina', distanceKm: 14.8 },
  { userId: 'u_charly', name: 'Charly', distanceKm: 12.6 },
  { userId: 'u_koffi', name: 'Koffi', distanceKm: 10.4 },
  { userId: 'u_fatou', name: 'Fatou', distanceKm: 9.1 },
  { userId: 'u_yawa', name: 'Yawa', distanceKm: 8.7 },
  { userId: 'u_moussa', name: 'Moussa', distanceKm: 7.9 },
  { userId: 'u_grace', name: 'Grace', distanceKm: 7.2 },
  { userId: 'u_ibrahim', name: 'Ibrahim', distanceKm: 6.8 },
  { userId: 'u_nadia', name: 'Nadia', distanceKm: 6.1 },
  { userId: 'u_serge', name: 'Serge', distanceKm: 5.5 },
  { userId: 'u_linda', name: 'Linda', distanceKm: 5.0 },
  { userId: 'u_paul', name: 'Paul', distanceKm: 4.4 },
  { userId: 'u_esther', name: 'Esther', distanceKm: 3.9 },
  { userId: 'u_eric', name: 'Eric', distanceKm: 3.3 },
  { userId: 'u_sarah', name: 'Sarah', distanceKm: 2.8 },
]
