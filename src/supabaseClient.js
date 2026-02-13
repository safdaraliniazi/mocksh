import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'mocksh-auth-token',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'mocksh-web-app'
    }
  }
})

// Helper function to handle rate limiting and retries
export const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      // Check if it's a rate limit error
      const isRateLimit = error?.message?.toLowerCase().includes('rate limit') || 
                         error?.status === 429
      
      if (isRateLimit && i < maxRetries - 1) {
        // Exponential backoff: wait 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
}

// Helper to verify profile exists after signup
export const verifyProfileExists = async (userId, maxAttempts = 5) => {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (data) return true
    
    if (i < maxAttempts - 1) {
      // Wait before retrying (500ms, 1s, 2s, 3s)
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
    }
  }
  
  return false
}
