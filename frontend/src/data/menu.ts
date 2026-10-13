import type { MenuItem } from '@/types'
import { todayKey } from '@/utils/id'

/** Date du jour décalée de n jours, au format YYYY-MM-DD (même convention que todayKey). */
export function dayKey(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayKey(d)
}

type Template = Omit<MenuItem, 'id' | 'date' | 'createdBy' | 'updatedAt'>

const days: Template[][] = [
  [
    { mealType: 'breakfast', name: 'Bouillie de mil + arachides', description: 'Bouillie peu sucrée, une poignée d’arachides grillées et une banane. Énergie stable jusqu’à midi.', calories: 340, protein: 12, carbs: 52, fat: 9 },
    { mealType: 'lunch', name: 'Attiéké + poisson grillé + crudités', description: 'Une louche d’attiéké, un poisson braisé sans huile ajoutée, tomates, oignons et concombre.', calories: 620, protein: 40, carbs: 70, fat: 16 },
    { mealType: 'snack', name: 'Yaourt nature + mangue', description: 'Un yaourt nature et une demi-mangue. Idéal 1 h avant la séance.', calories: 180, protein: 10, carbs: 26, fat: 4 },
    { mealType: 'dinner', name: 'Soupe de légumes + poulet', description: 'Soupe maison carottes, courgettes et gombo avec 120 g de poulet. Léger et rassasiant.', calories: 360, protein: 28, carbs: 34, fat: 10 },
  ],
  [
    { mealType: 'breakfast', name: 'Omelette + légumes + fruit', description: 'Deux œufs, tomates et oignons revenus, une tranche de pain complet et une orange.', calories: 380, protein: 24, carbs: 30, fat: 18 },
    { mealType: 'lunch', name: 'Riz + haricots + plantain', description: 'Riz et haricots rouges en quantité égale, quelques rondelles de plantain bouilli.', calories: 590, protein: 22, carbs: 92, fat: 12 },
    { mealType: 'snack', name: 'Banane + arachides', description: 'Une banane et 20 g d’arachides : la collation parfaite après l’entraînement.', calories: 260, protein: 8, carbs: 34, fat: 12 },
    { mealType: 'dinner', name: 'Patate douce + œufs + légumes', description: 'Patate douce vapeur, deux œufs durs et une salade verte.', calories: 470, protein: 24, carbs: 58, fat: 14 },
  ],
  [
    { mealType: 'breakfast', name: 'Pain complet + avocat + œuf', description: 'Pain complet grillé, un demi-avocat écrasé et un œuf mollet.', calories: 410, protein: 16, carbs: 42, fat: 20 },
    { mealType: 'lunch', name: 'Riz + poisson + légumes', description: 'Riz blanc, poisson en sauce tomate légère, carottes et haricots verts.', calories: 620, protein: 38, carbs: 68, fat: 16 },
    { mealType: 'snack', name: 'Œufs durs + pain', description: 'Deux œufs durs et un petit morceau de pain, pour tenir jusqu’au dîner.', calories: 230, protein: 14, carbs: 20, fat: 10 },
    { mealType: 'dinner', name: 'Poisson grillé + légumes sautés', description: 'Poisson grillé au citron et légumes sautés à l’huile d’olive.', calories: 430, protein: 40, carbs: 24, fat: 18 },
  ],
]

/** Menu de démonstration : aujourd'hui et les deux jours suivants. */
export function seedMenu(): MenuItem[] {
  const updatedAt = new Date().toISOString()
  return days.flatMap((items, offset) =>
    items.map((t, i) => ({
      ...t,
      id: `menu_${offset}_${i}`,
      date: dayKey(offset),
      createdBy: 'Coach Amina',
      updatedAt,
    })),
  )
}
