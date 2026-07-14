import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

/**
 * Inserts a new venue and its floor plan graph into Supabase.
 * @param {Object} venue - { id, name, city, address, floors }
 * @param {Object} graphJson - { nodes, edges } from FloorPlanEditor
 * @param {Object} options - { version, is_published }
 */
export async function registerVenue(venue, graphJson, options = {}) {
  const { error: venueError } = await supabase.from('venues').insert([venue])
  if (venueError) throw new Error(venueError.message)

  const { error: fpError } = await supabase.from('floor_plans').insert([{
    venue_id: venue.id,
    graph_json: graphJson,
    version: options.version || 1,
    is_published: options.is_published ?? true,
  }])
  if (fpError) throw new Error(fpError.message)
}

/**
 * Validate a floor plan graph via backend.
 * @param {Object} graphJson
 * @returns {Promise<{valid: boolean, issues: string[]}>}
 */
export async function validateFloorPlan(graphJson) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const response = await fetch(`${apiUrl}/api/venues/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph_json: graphJson }),
    })
    if (!response.ok) return { valid: false, issues: ['Validation server unavailable'] }
    return response.json()
  } catch {
    return { valid: false, issues: ['Could not reach validation server'] }
  }
}

/**
 * Fetches all registered venues ordered by creation date.
 */
export async function getAllVenues() {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
