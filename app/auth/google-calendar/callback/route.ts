/**
 * Google Calendar OAuth callback.
 *
 * This route is hit by Google after the user grants access.
 * It validates the CSRF state, exchanges the code for tokens,
 * and saves them to the DB using the admin client (no cookie context
 * is available in a cross-origin OAuth redirect).
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Strip trailing slash to prevent double-slash redirect URIs
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // User denied access on the consent screen
  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings?calendar=denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings?calendar=error`)
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings?calendar=error`)
  }

  // Clear the state cookie — it's single-use
  cookieStore.delete('google_oauth_state')

  // Identify the authenticated user — cookies ARE present in the callback
  // because the user was already logged in to Locus before clicking "Connect"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`)
  }

  // Exchange authorization code for access + refresh tokens
  const redirectUri = `${APP_URL}/auth/google-calendar/callback`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[calendar callback] token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${APP_URL}/settings?calendar=error`)
  }

  const tokenData = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokenData

  if (!access_token || !refresh_token) {
    console.error('[calendar callback] missing tokens in response')
    return NextResponse.redirect(`${APP_URL}/settings?calendar=error`)
  }

  // Persist tokens using admin client — bypasses RLS for this server-to-server write.
  // The regular cookie session IS present (used above for user identity), but the admin
  // client is used here because the upsert must succeed regardless of RLS evaluation timing.
  const admin = createAdminClient()
  await admin
    .from('google_calendar_tokens')
    .upsert(
      {
        user_id:       user.id,
        access_token,
        refresh_token,
        expires_at:    new Date(Date.now() + expires_in * 1000).toISOString(),
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  return NextResponse.redirect(`${APP_URL}/settings?calendar=connected`)
}
