import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from './useRealtime'

export function useNewOrdersCount(enabled = true) {
  const [count, setCount] = useState(0)

  async function fetchCount() {
    const { count: c } = await supabase
      .from('website_orders')
      .select('*', { count: 'exact', head: true })
      .eq('shipped', false)
    setCount(c || 0)
  }

  useEffect(() => {
    if (!enabled) return
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [enabled])

  useRealtime('website_orders', enabled ? fetchCount : () => {})

  return enabled ? count : 0
}
