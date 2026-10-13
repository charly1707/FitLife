import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CheckCircle2, Flame, Heart, ShieldCheck, Star } from 'lucide-react'
import { Logo } from './Logo'
import { AvatarStack } from '@/components/ui'
import { img, portraitFor } from '@/data/images'
import { cn } from '@/utils/cn'

const slides = [
  {
    photo: 'photo-1631899477678-9d3c5aeded2d',
    position: '50% 40%',
    title: (
      <>
        Plus qu’une appli, un vrai <span className="text-fit">accompagnement</span>.
      </>
    ),
    quote: 'En 3 mois j’ai perdu 7 kg sans jamais me sentir seule. Les lives du matin sont devenus mon rituel.',
    author: 'Fatou',
    meta: 'Membre depuis 2025 · Abidjan',
  },
  {
    photo: 'photo-1649888471945-b96947250299',
    position: '60% 30%',
    title: (
      <>
        Des séances qui s’adaptent à <span className="text-fit">ta vie</span>, pas l’inverse.
      </>
    ),
    quote: '20 minutes à la maison, sans matériel. J’ai enfin trouvé un programme que je tiens sur la durée.',
    author: 'Amina',
    meta: 'Programme Remise en forme · Dakar',
  },
  {
    photo: 'photo-1616803689943-5601631c7fec',
    position: '50% 50%',
    title: (
      <>
        Tes progrès, tes défis, ta <span className="text-fit">communauté</span>.
      </>
    ),
    quote: 'Le classement de la semaine me motive plus que n’importe quelle salle. On se pousse entre membres.',
    author: 'Koffi',
    meta: 'Défi 100 km terminé · Lomé',
  },
]

const members = ['Amina', 'Koffi', 'Fatou', 'Moussa', 'Grace']

export function AuthLayout() {
  const { pathname } = useLocation()
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000)
    return () => window.clearInterval(t)
  }, [])

  const showTabs = pathname === '/login' || pathname === '/register'

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-900 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Fond animé */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora -left-32 -top-32 h-[28rem] w-[28rem] bg-fit/30" />
        <div className="aurora aurora-2 bottom-[-10rem] left-1/4 h-[26rem] w-[26rem] bg-emerald-700/30" />
        <div className="auth-grid absolute inset-0" />
      </div>

      {/* Bandeau photo mobile */}
      <div
        className="relative h-64 overflow-hidden lg:hidden"
        style={{ maskImage: 'linear-gradient(to bottom, #000 55%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}
      >
        {slides.map((s, i) => (
          <img
            key={s.photo}
            src={img(s.photo, 900, 640)}
            alt=""
            style={{ objectPosition: s.position }}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000',
              i === index ? 'kenburns opacity-100' : 'opacity-0',
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/50 via-transparent to-transparent" />
        <NavLink to="/" className="absolute left-5 top-6">
          <Logo size="md" />
        </NavLink>
        <div className="absolute right-5 top-7 inline-flex items-center gap-2 rounded-full bg-ink-900/60 py-1.5 pl-1.5 pr-3 backdrop-blur-md">
          <AvatarStack names={members} max={3} />
          <span className="text-[11px] font-semibold text-white">+25 k</span>
        </div>
      </div>

      {/* Colonne formulaire */}
      <div className="relative z-10">
        <div className="mx-auto flex min-h-[calc(100vh-15rem)] w-full max-w-[30rem] flex-col px-4 pb-8 sm:px-6 lg:min-h-screen lg:py-10">
          <NavLink to="/" className="hidden lg:block">
            <Logo size="md" />
          </NavLink>

          <div className="-mt-10 flex flex-1 flex-col justify-center lg:mt-0 lg:py-8">
            <div className="glow-card rise rounded-[2rem] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-8">
              {showTabs && (
                <div className="relative mb-7 grid grid-cols-2 rounded-2xl bg-ink-900/70 p-1 text-sm font-semibold">
                  <span
                    className={cn(
                      'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-fit shadow-fit transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]',
                      pathname === '/register' && 'translate-x-full',
                    )}
                  />
                  {[
                    ['/login', 'Connexion'],
                    ['/register', 'Inscription'],
                  ].map(([to, label]) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          'relative z-10 rounded-xl py-2.5 text-center transition-colors',
                          isActive ? 'text-ink-900' : 'text-white/55 hover:text-white',
                        )
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
              <div key={pathname} className="rise">
                <Outlet />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-5 text-[11px] text-white/35">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-fit/70" /> Données protégées
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star size={13} className="text-amber-300/70" /> 4,9/5 par nos membres
              </span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/25">Ton corps. Ton alimentation. Ton coach.</p>
        </div>
      </div>

      {/* Visuel desktop */}
      <aside className="relative z-10 hidden p-4 lg:block">
        <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-white/10">
          {slides.map((s, i) => (
            <img
              key={s.photo}
              src={img(s.photo, 1400)}
              alt=""
              style={{ objectPosition: s.position }}
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000',
                i === index ? 'kenburns opacity-100' : 'opacity-0',
              )}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/25 to-ink-900/30" />

          {/* Membres actifs */}
          <div className="absolute left-8 top-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-ink-900/55 py-2 pl-2 pr-4 backdrop-blur-md">
            <AvatarStack names={members} max={5} />
            <span className="text-xs font-medium text-white/85">
              <b className="text-white">+25 000</b> membres actifs
            </span>
          </div>

          {/* Widgets flottants façon app */}
          <div className="float-slow absolute right-8 top-24 w-52 rounded-2xl border border-white/10 bg-ink-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                <Heart size={13} className="text-rose-400" fill="currentColor" /> Fréquence cardiaque
              </span>
            </div>
            <p className="mt-1 font-display text-2xl font-extrabold text-white">
              142 <span className="text-xs font-semibold text-white/50">bpm</span>
            </p>
            <svg viewBox="0 0 120 30" className="ekg mt-1 h-8 w-full text-rose-400" fill="none">
              <path
                d="M0 15h30l6-10 8 22 7-17 5 5h64"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="float-slower absolute right-24 top-[15.5rem] inline-flex [@media(max-height:760px)]:hidden items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3 pr-4 backdrop-blur-md">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
              <Flame size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-white">482 kcal</p>
              <p className="text-[11px] text-white/55">brûlées aujourd’hui</p>
            </div>
          </div>

          <div className="float-slow absolute left-8 top-40 inline-flex items-center gap-2.5 rounded-2xl border border-fit/30 bg-fit/15 px-3.5 py-2.5 backdrop-blur-md">
            <CheckCircle2 size={18} className="text-fit" />
            <span className="text-xs font-semibold text-white">Séance Full Body validée</span>
          </div>

          {/* Texte + témoignage */}
          <div className="absolute inset-x-8 bottom-8 space-y-5">
            <h2 key={`t${index}`} className="rise max-w-lg text-4xl font-extrabold leading-tight text-white xl:text-5xl">
              {slide.title}
            </h2>

            <figure
              key={`q${index}`}
              className="rise max-w-lg rounded-3xl border border-white/10 bg-ink-900/55 p-5 backdrop-blur-md"
              style={{ animationDelay: '120ms' }}
            >
              <div className="flex gap-0.5 text-amber-300">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <blockquote className="mt-2 text-sm leading-relaxed text-white/85">« {slide.quote} »</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <img src={portraitFor(slide.author, 96)} alt={slide.author} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-white">{slide.author}</p>
                  <p className="text-xs text-white/50">{slide.meta}</p>
                </div>
              </figcaption>
            </figure>

            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Visuel ${i + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    i === index ? 'w-10 bg-fit' : 'w-4 bg-white/30 hover:bg-white/50',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
