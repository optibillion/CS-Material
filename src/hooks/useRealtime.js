import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table, callback, channelName = `realtime-${table}`) {
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: '*', schema: 'public', table },
        () => callback()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table, channelName])
}