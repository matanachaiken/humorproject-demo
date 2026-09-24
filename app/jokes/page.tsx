import { supabase } from '@/lib/supabaseClient'

export const revalidate = 0

export default async function JokesPage() {
  const { data: jokes, error } = await supabase
    .from('jokes')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    return (
      <main className="p-10">
        <p className="text-red-600">Error loading jokes: {error.message}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-10">
      <h1 className="mb-6 text-3xl font-bold">Jokes</h1>
      <ul className="space-y-4">
        {jokes?.map((joke) => (
          <li key={joke.id} className="rounded-lg border p-4">
            <p className="font-medium">{joke.setup}</p>
            <p className="mt-1 text-gray-600">{joke.punchline}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}