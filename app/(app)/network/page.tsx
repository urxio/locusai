import { createClient } from '@/lib/supabase/server'
import { getPeople } from '@/lib/db/people'
import NetworkList from '@/components/network/NetworkList'

export const dynamic = 'force-dynamic'

export default async function NetworkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const people = await getPeople(user.id)

  return <NetworkList initialPeople={people} />
}
