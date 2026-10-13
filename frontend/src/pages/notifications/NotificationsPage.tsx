import { Bell, CheckCheck } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Button, Card, Spinner, fallbackNotificationIcon, notificationIcons } from '@/components/ui'
import { relativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

export function NotificationsPage() {
  const { data, loading, reload } = useAsync(() => api.getNotifications(), [])

  if (loading || !data) return <Spinner label="Chargement des notifications…" />

  const unread = data.filter((n) => !n.read).length

  const markRead = async (id: string) => {
    await api.markNotificationRead(id)
    reload()
  }

  const markAll = async () => {
    await api.markAllNotificationsRead()
    reload()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        compact
        title="Notifications"
        subtitle={unread > 0 ? `${unread} non lue(s) · on te tient au courant` : 'Tout est à jour'}
        icon={<Bell size={22} />}
        image={pageHeroes.notifications}
        actions={
          unread > 0 && (
            <Button variant="secondary" size="sm" onClick={markAll} leftIcon={<CheckCheck size={15} />}>
              Tout lire
            </Button>
          )
        }
      />

      <div className="space-y-3">
        {data.length === 0 && (
          <Card className="text-center text-sm text-white/50">
            Aucune notification pour le moment. Nous te tiendrons au courant de tes rappels, défis et
            classements.
          </Card>
        )}
        {data.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={cn(
              'block w-full rounded-3xl border px-4 py-3.5 text-left transition',
              n.read ? 'border-white/5 bg-ink-800/50 opacity-75' : 'border-fit/25 bg-ink-700',
            )}
          >
            <div className="flex items-start gap-3">
              {(() => {
                const { icon: Icon, tone } = notificationIcons[n.type] ?? fallbackNotificationIcon
                return (
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', tone)}>
                    <Icon size={18} />
                  </span>
                )
              })()}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{n.title}</p>
                <p className="mt-0.5 text-sm text-white/60">{n.body}</p>
                <p className="mt-1 text-[11px] text-white/35">{relativeTime(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-fit" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}