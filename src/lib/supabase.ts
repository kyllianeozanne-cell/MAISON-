import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Client Supabase, créé uniquement si les variables d'environnement sont renseignées.
 * Sans elles, MAISON fonctionne en local (données dans IndexedDB sur l'appareil).
 * La clé « anon » est publique par conception : la sécurité repose sur les
 * politiques RLS de supabase/schema.sql.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
