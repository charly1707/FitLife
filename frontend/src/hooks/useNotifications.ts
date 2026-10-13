import { useEffect, useState } from 'react'
import { api } from '@/services'

export function useUnreadNotifications(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const list = await api.getNotifications()
        if (active) setCount(list.filter((n) => !n.read).length)
      } catch {
        /* not authenticated */
      }
    }
    void load()
    const id = window.setInterval(load, 20000)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [])

  return count
}
