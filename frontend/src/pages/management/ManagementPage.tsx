import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CalendarPlus,
  Eye,
  Salad,
  LayoutDashboard,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Play,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  Users,
} from 'lucide-react'
import type { Announcement, FitEvent, LiveSession } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Badge, Button, Card, EmptyState, Spinner, StatCard, Tabs } from '@/components/ui'
import { PageHero } from '@/components/layout/PageHero'
import { SectionTitle } from '@/components/layout/PageHero'
import { AnnouncementCard } from '@/components/domain/AnnouncementCard'
import { eventDateParts } from '@/components/domain/EventCard'
import { coachCatalog } from '@/data/coaches'
import { liveImage, pageHeroes } from '@/data/images'
import { eventCategoryLabels, levelLabels } from '@/utils/labels'
import { formatDateTime, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import { AnnouncementFormModal, ConfirmModal, EventFormModal, LiveFormModal } from './forms'
import type { LiveFormValues } from './forms'
import { MenuManager } from './MenuManager'
import { isAdmin, isSuperAdmin } from '@/utils/roles'

type Section = 'overview' | 'lives' | 'events' | 'menu' | 'announcements'
type LiveFilter = 'scheduled' | 'live' | 'ended'

interface Data {
  lives: LiveSession[]
  events: FitEvent[]
  announcements: Announcement[]
}

type Dialog =
  | { kind: 'live'; item?: LiveSession; startNow?: boolean }
  | { kind: 'event'; item?: FitEvent }
  | { kind: 'announcement'; item?: Announcement }
  | { kind: 'delete'; what: 'live' | 'event' | 'announcement'; id: string; label: string }
  | null

const isUpcoming = (iso: string, minutes = 0) => new Date(iso).getTime() + minutes * 60e3 > Date.now()

function IconAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition',
        danger ? 'hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300' : 'hover:border-fit/40 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

export function ManagementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('overview')
  const [liveFilter, setLiveFilter] = useState<LiveFilter>('scheduled')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [toast, setToast] = useState('')

  const { data, loading, setData } = useAsync<Data>(async () => {
    const [lives, events, announcements] = await Promise.all([api.getLives(), api.getEvents(), api.getAnnouncements(true)])
    return { lives, events, announcements }
  }, [])

  if (loading || !data) return <Spinner label="Chargement de l’Espace Gestion…" />

  const adminView = isAdmin(user)
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
  const ownCoach = coachCatalog.find((c) => c.name === fullName)
  const defaultCoach = ownCoach
    ? { id: ownCoach.id, name: ownCoach.name }
    : user?.role === 'coach'
      ? { id: user.id, name: fullName }
      : { id: coachCatalog[0].id, name: coachCatalog[0].name }

  const liveNow = data.lives.filter((l) => l.status === 'live')
  const scheduled = data.lives.filter((l) => l.status === 'scheduled')
  const upcomingEvents = data.events.filter((e) => isUpcoming(e.startsAt, e.durationMinutes))
  const activeAnnouncements = data.announcements.filter((a) => !a.expiresAt || isUpcoming(a.expiresAt))

  const open = (d: Dialog) => {
    setDialogKey((k) => k + 1)
    setDialog(d)
  }
  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  /* ----- Actions ----- */
  const saveLive = async (v: LiveFormValues, existing?: LiveSession) => {
    const payload: Partial<LiveSession> = {
      title: v.title,
      description: v.description,
      coachId: v.coachId,
      coachName: v.coachName,
      durationMinutes: v.durationMinutes,
      level: v.level,
      premiumOnly: v.premiumOnly,
      streamUrl: v.streamUrl.trim() || null,
      ...(v.scheduledAt && !v.startNow ? { scheduledAt: v.scheduledAt } : {}),
    }
    if (existing) {
      const updated = await api.updateLive(existing.id, payload)
      setData({ ...data, lives: data.lives.map((l) => (l.id === updated.id ? updated : l)) })
      flash('Live mis à jour')
    } else {
      const created = await api.createLive({ ...payload, ...(v.startNow ? { status: 'live' as const } : {}) })
      setData({ ...data, lives: [created, ...data.lives] })
      flash(v.startNow ? 'Tu es en direct ! Les membres ont été prévenus.' : 'Live programmé, les membres ont été prévenus.')
    }
  }

  const setLiveStatus = async (live: LiveSession, status: LiveSession['status']) => {
    const updated = await api.setLiveStatus(live.id, status)
    setData({ ...data, lives: data.lives.map((l) => (l.id === updated.id ? updated : l)) })
    flash(status === 'live' ? 'Live démarré' : 'Live terminé')
  }

  const saveEvent = async (input: Parameters<typeof api.createEvent>[0], existing?: FitEvent) => {
    if (existing) {
      const updated = await api.updateEvent(existing.id, input)
      setData({ ...data, events: data.events.map((e) => (e.id === updated.id ? updated : e)) })
      flash('Événement mis à jour')
    } else {
      const created = await api.createEvent(input)
      setData({ ...data, events: [...data.events, created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) })
      flash('Événement publié, les membres ont été prévenus.')
    }
  }

  const saveAnnouncement = async (input: Parameters<typeof api.createAnnouncement>[0], existing?: Announcement) => {
    if (existing) {
      const updated = await api.updateAnnouncement(existing.id, input)
      setData({ ...data, announcements: data.announcements.map((a) => (a.id === updated.id ? updated : a)) })
      flash('Annonce actualisée')
    } else {
      const created = await api.createAnnouncement(input)
      setData({ ...data, announcements: [created, ...data.announcements] })
      flash('Annonce publiée')
    }
  }

  const togglePin = async (a: Announcement) => {
    const updated = await api.updateAnnouncement(a.id, { pinned: !a.pinned })
    setData({ ...data, announcements: data.announcements.map((x) => (x.id === updated.id ? updated : x)) })
  }

  const confirmDelete = async (what: 'live' | 'event' | 'announcement', id: string) => {
    if (what === 'live') {
      await api.deleteLive(id)
      setData({ ...data, lives: data.lives.filter((l) => l.id !== id) })
    } else if (what === 'event') {
      await api.deleteEvent(id)
      setData({ ...data, events: data.events.filter((e) => e.id !== id) })
    } else {
      await api.deleteAnnouncement(id)
      setData({ ...data, announcements: data.announcements.filter((a) => a.id !== id) })
    }
    flash('Supprimé')
  }

  /* ----- Agenda combiné (lives + événements à venir) ----- */
  const agenda = [
    ...scheduled.map((l) => ({ id: l.id, at: l.scheduledAt, title: l.title, sub: `Live · ${l.coachName}`, kind: 'live' as const })),
    ...upcomingEvents.map((e) => ({ id: e.id, at: e.startsAt, title: e.title, sub: `${eventCategoryLabels[e.category]} · ${e.attendees} inscrit${e.attendees > 1 ? 's' : ''}`, kind: 'event' as const })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 5)

  const visibleLives = data.lives
    .filter((l) => l.status === liveFilter)
    .sort((a, b) => (liveFilter === 'ended' ? b.scheduledAt.localeCompare(a.scheduledAt) : a.scheduledAt.localeCompare(b.scheduledAt)))

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow={adminView ? 'Administration du groupe' : 'Espace Coach'}
        title="Espace Gestion"
        subtitle="Lance tes lives, programme les événements et tiens les membres informés."
        icon={<ShieldCheck size={22} />}
        image={pageHeroes.coachSpace}
        actions={
          <>
          {isSuperAdmin(user) && (
            <Link to="/super-admin">
              <Button variant="secondary" leftIcon={<ShieldAlert size={16} />}>
                <span className="hidden sm:inline">Super admin</span>
              </Button>
            </Link>
          )}
          <Button
            onClick={() => open({ kind: 'live', startNow: true })}
            leftIcon={<Radio size={16} />}
            className="bg-red-500 text-white shadow-[0_10px_30px_-12px_rgba(239,68,68,0.7)] hover:bg-red-600"
          >
            <span className="hidden sm:inline">Passer en direct</span>
            <span className="sm:hidden">Direct</span>
          </Button>
          </>
        }
      />

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: 'overview', label: 'Tableau de bord', icon: <LayoutDashboard size={15} /> },
          { value: 'lives', label: 'Lives', icon: <Radio size={15} />, count: scheduled.length + liveNow.length },
          { value: 'events', label: 'Événements', icon: <CalendarDays size={15} />, count: upcomingEvents.length },
          { value: 'menu', label: 'Alimentation', icon: <Salad size={15} /> },
          { value: 'announcements', label: 'Annonces', icon: <Megaphone size={15} />, count: activeAnnouncements.length },
        ]}
      />

      {/* ---------- Tableau de bord ---------- */}
      {section === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="En direct" value={liveNow.length} icon={<Radio size={14} />} accent={liveNow.length > 0} />
            <StatCard label="Lives programmés" value={scheduled.length} icon={<CalendarPlus size={14} />} />
            <StatCard label="Événements à venir" value={upcomingEvents.length} icon={<CalendarDays size={14} />} />
            <StatCard label="Annonces actives" value={activeAnnouncements.length} icon={<Megaphone size={14} />} />
          </div>

          {liveNow.map((live) => (
            <Card key={live.id} padding="none" className="overflow-hidden border-red-500/30">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-2xl sm:w-40">
                  <img src={liveImage(live.title, 400)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> EN DIRECT
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold text-white">{live.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-white/55">
                    <Eye size={13} /> {formatNumber(live.viewers)} spectateurs · {live.coachName} · {levelLabels[live.level]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/lives/${live.id}`)} leftIcon={<Eye size={14} />}>
                    Ouvrir la salle
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setLiveStatus(live, 'ended')} leftIcon={<Square size={14} />}>
                    Terminer
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <section>
            <SectionTitle title="Actions rapides" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                { label: 'Passer en direct', sub: 'Démarre un live tout de suite', icon: Radio, tone: 'text-red-300 bg-red-500/15', onClick: () => open({ kind: 'live', startNow: true }) },
                { label: 'Programmer un live', sub: 'Date, coach, niveau', icon: CalendarPlus, tone: 'text-fit bg-fit/15', onClick: () => open({ kind: 'live' }) },
                { label: 'Créer un événement', sub: 'Course, atelier, rencontre', icon: CalendarDays, tone: 'text-sky-300 bg-sky-400/15', onClick: () => open({ kind: 'event' }) },
                { label: 'Menu du jour', sub: 'Aliments et descriptions', icon: Salad, tone: 'text-lime-300 bg-lime-400/15', onClick: () => setSection('menu') },
                { label: 'Publier une annonce', sub: 'Info à tous les membres', icon: Megaphone, tone: 'text-amber-300 bg-amber-400/15', onClick: () => open({ kind: 'announcement' }) },
              ].map(({ label, sub, icon: Icon, tone, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="surface group flex flex-col items-start gap-3 rounded-3xl p-4 text-left transition hover:-translate-y-0.5 hover:border-white/15"
                >
                  <span className={cn('grid h-11 w-11 place-items-center rounded-2xl transition group-hover:scale-110', tone)}>
                    <Icon size={20} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-white">{label}</span>
                    <span className="block text-xs text-white/45">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <SectionTitle title="Agenda à venir" icon={<CalendarDays />} />
              {agenda.length === 0 ? (
                <EmptyState title="Rien de programmé" description="Programme un live ou crée un événement." />
              ) : (
                <Card padding="none" className="divide-y divide-white/[0.06]">
                  {agenda.map((item) => {
                    const d = eventDateParts(item.at)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.kind === 'live' ? 'lives' : 'events')}
                        className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-white/[0.03]"
                      >
                        <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-white/[0.05] py-1">
                          <span className="font-display text-base font-extrabold leading-none text-white">{d.day}</span>
                          <span className="text-[10px] font-semibold uppercase text-fit">{d.month}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                          <span className="block truncate text-xs text-white/45">
                            {d.time} · {item.sub}
                          </span>
                        </span>
                        {item.kind === 'live' ? <Radio size={16} className="text-white/30" /> : <CalendarDays size={16} className="text-white/30" />}
                      </button>
                    )
                  })}
                </Card>
              )}
            </section>

            <section>
              <SectionTitle
                title="Dernières annonces"
                icon={<Megaphone />}
                action={
                  <button onClick={() => setSection('announcements')} className="text-xs font-semibold text-fit">
                    Tout gérer
                  </button>
                }
              />
              <div className="space-y-3">
                {activeAnnouncements.slice(0, 2).map((a) => (
                  <AnnouncementCard key={a.id} announcement={a} />
                ))}
                {activeAnnouncements.length === 0 && <EmptyState title="Aucune annonce active" />}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ---------- Lives ---------- */}
      {section === 'lives' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={liveFilter}
              onChange={setLiveFilter}
              className="flex-1"
              tabs={[
                { value: 'scheduled', label: 'Programmés', count: scheduled.length },
                { value: 'live', label: 'En direct', count: liveNow.length },
                { value: 'ended', label: 'Terminés' },
              ]}
            />
            <Button onClick={() => open({ kind: 'live' })} leftIcon={<CalendarPlus size={16} />}>
              Programmer
            </Button>
          </div>

          {visibleLives.length === 0 ? (
            <EmptyState icon={<Radio size={30} />} title="Aucun live dans cette catégorie" />
          ) : (
            <div className="space-y-3">
              {visibleLives.map((live) => (
                <Card key={live.id} padding="sm" className="flex items-center gap-3">
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl sm:w-28">
                    <img src={liveImage(live.title, 300)} alt="" className="h-full w-full object-cover" />
                    {live.status === 'live' && <span className="absolute left-1.5 top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 ring-2 ring-ink-900" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{live.title}</p>
                    <p className="truncate text-xs text-white/50">
                      {formatDateTime(live.scheduledAt)} · {live.durationMinutes} min · {live.coachName}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="gray">{levelLabels[live.level]}</Badge>
                      {live.premiumOnly && <Badge tone="amber">Premium</Badge>}
                      {live.status !== 'scheduled' && (
                        <Badge tone="gray">
                          <Users size={10} /> {formatNumber(live.viewers)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {live.status === 'scheduled' && (
                      <Button size="sm" onClick={() => setLiveStatus(live, 'live')} leftIcon={<Play size={14} />}>
                        <span className="hidden sm:inline">Démarrer</span>
                      </Button>
                    )}
                    {live.status === 'live' && (
                      <Button size="sm" variant="danger" onClick={() => setLiveStatus(live, 'ended')} leftIcon={<Square size={14} />}>
                        <span className="hidden sm:inline">Terminer</span>
                      </Button>
                    )}
                    {live.status !== 'ended' && (
                      <IconAction label="Modifier" onClick={() => open({ kind: 'live', item: live })}>
                        <Pencil size={15} />
                      </IconAction>
                    )}
                    <IconAction label="Supprimer" danger onClick={() => open({ kind: 'delete', what: 'live', id: live.id, label: live.title })}>
                      <Trash2 size={15} />
                    </IconAction>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Événements ---------- */}
      {section === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/55">
              {upcomingEvents.length} à venir · {data.events.length - upcomingEvents.length} passé{data.events.length - upcomingEvents.length > 1 ? 's' : ''}
            </p>
            <Button onClick={() => open({ kind: 'event' })} leftIcon={<CalendarPlus size={16} />}>
              Créer un événement
            </Button>
          </div>
          {data.events.length === 0 ? (
            <EmptyState icon={<CalendarDays size={30} />} title="Aucun événement" description="Crée le premier rendez-vous de la communauté." />
          ) : (
            <div className="space-y-3">
              {[...upcomingEvents, ...data.events.filter((e) => !upcomingEvents.includes(e)).reverse()].map((event) => {
                const d = eventDateParts(event.startsAt)
                const past = !upcomingEvents.includes(event)
                return (
                  <Card key={event.id} padding="sm" className={cn('flex items-center gap-3', past && 'opacity-55')}>
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl sm:w-28">
                      {event.coverUrl && <img src={event.coverUrl} alt="" className="h-full w-full object-cover" />}
                      <span className="absolute bottom-1 left-1 rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-ink-900">
                        {d.day} {d.month}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{event.title}</p>
                      <p className="truncate text-xs text-white/50">
                        {eventCategoryLabels[event.category]} · {d.time} · {event.location}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-fit">
                        {event.attendees} inscrit{event.attendees > 1 ? 's' : ''}
                        {event.capacity !== null && <span className="font-normal text-white/40"> / {event.capacity} places</span>}
                        {past && <span className="font-normal text-white/40"> · terminé</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <IconAction label="Modifier" onClick={() => open({ kind: 'event', item: event })}>
                        <Pencil size={15} />
                      </IconAction>
                      <IconAction label="Supprimer" danger onClick={() => open({ kind: 'delete', what: 'event', id: event.id, label: event.title })}>
                        <Trash2 size={15} />
                      </IconAction>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- Alimentation ---------- */}
      {section === 'menu' && <MenuManager onToast={flash} />}

      {/* ---------- Annonces ---------- */}
      {section === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/55">Affichées sur l’accueil de tous les membres.</p>
            <Button onClick={() => open({ kind: 'announcement' })} leftIcon={<Megaphone size={16} />}>
              Publier
            </Button>
          </div>
          {data.announcements.length === 0 ? (
            <EmptyState icon={<Megaphone size={30} />} title="Aucune annonce" description="Publie une information pour toute la communauté." />
          ) : (
            <div className="space-y-3">
              {[...data.announcements]
                .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
                .map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={a}
                    actions={
                      <>
                        <IconAction label={a.pinned ? 'Désépingler' : 'Épingler'} onClick={() => togglePin(a)}>
                          {a.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                        </IconAction>
                        <IconAction label="Actualiser" onClick={() => open({ kind: 'announcement', item: a })}>
                          <Pencil size={15} />
                        </IconAction>
                        <IconAction label="Supprimer" danger onClick={() => open({ kind: 'delete', what: 'announcement', id: a.id, label: a.title })}>
                          <Trash2 size={15} />
                        </IconAction>
                      </>
                    }
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Fenêtres ---------- */}
      {dialog?.kind === 'live' && (
        <LiveFormModal
          key={dialogKey}
          open
          onClose={() => setDialog(null)}
          initial={dialog.item}
          defaultCoach={defaultCoach}
          startNow={dialog.startNow}
          onSubmit={(v) => saveLive(v, dialog.item)}
        />
      )}
      {dialog?.kind === 'event' && (
        <EventFormModal key={dialogKey} open onClose={() => setDialog(null)} initial={dialog.item} onSubmit={(v) => saveEvent(v, dialog.item)} />
      )}
      {dialog?.kind === 'announcement' && (
        <AnnouncementFormModal
          key={dialogKey}
          open
          onClose={() => setDialog(null)}
          initial={dialog.item}
          onSubmit={(v) => saveAnnouncement(v, dialog.item)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmModal
          key={dialogKey}
          open
          title="Supprimer définitivement ?"
          message={`« ${dialog.label} » sera supprimé pour tous les membres. Cette action est irréversible.`}
          onConfirm={() => confirmDelete(dialog.what, dialog.id)}
          onClose={() => setDialog(null)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-sm animate-slide-up rounded-2xl border border-fit/30 bg-ink-800/95 px-4 py-3 text-center text-sm font-semibold text-white shadow-card backdrop-blur lg:bottom-8">
          {toast}
        </div>
      )}
    </div>
  )
}
