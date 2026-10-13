import { useRef, useState } from 'react'
import { Bot, Lightbulb, MessageCircle, Send } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Button, Card, Spinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { UserRound } from 'lucide-react'

const SUGGESTIONS = [
  'Je n’ai que 20 minutes aujourd’hui.',
  'Donne-moi une idée de repas.',
  'Je suis démotivé, donne-moi un coup de pouce.',
  'Explique-moi le squat.',
]

export function CoachAiPage() {
  const { data, loading, reload } = useAsync(() => api.getAiConversation(), [])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const send = async (value?: string) => {
    const content = (value ?? text).trim()
    if (!content) return
    setSending(true)
    try {
      await api.sendAiMessage(content)
      setText('')
      reload()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-200px)] flex-col space-y-4 animate-fade-in lg:h-[calc(100vh-110px)]">
      <PageHero
        compact
        eyebrow="Disponible 24/7"
        title="Coach IA"
        subtitle="Adapte une séance, trouve un repas, retrouve ta motivation."
        icon={<Bot size={22} />}
        image={pageHeroes.coachAi}
        imagePosition="70% 50%"
      />

      <Card padding="none" className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loading || !data ? (
            <Spinner label="Chargement de la conversation…" />
          ) : data.length === 0 ? (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-fit/15 text-fit">
                <MessageCircle size={28} />
              </div>
              <p className="text-sm text-white/60">
                Salut ! Je suis ton Coach IA. Adapte une séance, propose un repas, motivé-moi…
                Pose-moi ta première question.
              </p>
            </div>
          ) : (
            data.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}
              >
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                    m.role === 'user' ? 'bg-ink-700' : 'bg-fit/20 text-fit',
                  )}
                >
                  {m.role === 'user' ? <UserRound size={16} /> : <Bot size={16} />}
                </span>
                <div
                  className={cn(
                    'whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    m.role === 'user' ? 'bg-fit text-ink-900' : 'bg-ink-800 text-white/90',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {sending && <Spinner label="Le coach réfléchit…" />}
          <div ref={endRef} />
        </div>

        <div className="border-t border-white/5 p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-white/10 bg-ink-800 px-3 py-1.5 text-[11px] text-white/60 hover:border-fit/40 hover:text-white"
              >
                <Lightbulb size={10} className="mr-1 inline text-fit" />
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Pose ta question au coach…"
              className="h-11 flex-1 rounded-2xl bg-ink-800 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-fit/40"
            />
            <Button size="icon" onClick={() => send()} disabled={!text.trim()} loading={sending}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>

      <p className="text-center text-[10px] text-white/30">
        FitLife ne remplace pas un médecin ou un nutritionniste. En cas de doute, consulte un
        professionnel de santé.
      </p>
    </div>
  )
}