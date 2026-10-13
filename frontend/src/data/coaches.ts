import type { Coach } from '@/types'

export const coachCatalog: Coach[] = [
  {
    id: 'coach_awa',
    name: 'Coach Awa',
    specialty: 'Full Body & Renforcement',
    bio: 'Coach certifiée, spécialiste du renforcement à la maison. 8 ans d’expérience.',
    followers: 12400,
    rating: 4.9,
    liveCount: 128,
  },
  {
    id: 'coach_koffi',
    name: 'Coach Koffi',
    specialty: 'Cardio & Perte de poids',
    bio: 'Passionné de cardio et de HIIT, il t’aide à brûler un maximum de calories.',
    followers: 9800,
    rating: 4.8,
    liveCount: 96,
  },
  {
    id: 'coach_amina',
    name: 'Coach Amina',
    specialty: 'Nutrition & Yoga',
    bio: 'Nutritionniste diplômée et professeure de yoga. Équilibre corps et esprit.',
    followers: 15200,
    rating: 5.0,
    liveCount: 210,
  },
  {
    id: 'coach_david',
    name: 'Coach David',
    specialty: 'Musculation',
    bio: 'Ancien athlète, il structure tes programmes de prise de masse.',
    followers: 7300,
    rating: 4.7,
    liveCount: 64,
  },
]

export const coachById = (id: string) => coachCatalog.find((c) => c.id === id)
