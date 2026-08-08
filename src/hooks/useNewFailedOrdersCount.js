import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from './useRealtime'

export function useNewFailedOrdersCount(enabled = true) {
  const [count, setCount] = useState(0)

  async function fetchCount() {
    const { count: c } = await supabase
      .from('website_failed_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'New')
    setCount(c || 0)
  }

  useEffect(() => {
    if (!enabled) return
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [enabled])

  useRealtime('website_failed_orders', enabled ? fetchCount : () => {})

  return enabled ? count : 0
}
