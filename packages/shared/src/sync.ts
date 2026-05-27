import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { PackingList } from "./index";

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface PackingListRow {
  id: string;
  owner_id: string;
  name: string;
  trip_type: string;
  payload: PackingList;
  updated_at: string;
}

export interface SyncService {
  signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }>;
  signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  listPackingLists(): Promise<PackingList[]>;
  upsertPackingList(input: PackingList): Promise<{ data: PackingList | null; error: string | null }>;
}

function mapRowToPackingList(row: PackingListRow): PackingList {
  return {
    ...row.payload,
    id: row.id,
    updatedAt: row.updated_at,
    name: row.name,
    tripType: row.trip_type
  };
}

function mapPackingListToRow(list: PackingList, ownerId: string): PackingListRow {
  return {
    id: list.id,
    owner_id: ownerId,
    name: list.name,
    trip_type: list.tripType,
    payload: list,
    updated_at: list.updatedAt
  };
}

async function requireSessionUser(client: SupabaseClient): Promise<User> {
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    throw new Error("No active session. Sign in first.");
  }
  return user;
}

export function createSyncService(config: SyncConfig): SyncService {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);

  return {
    async signIn(email: string, password: string) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      return { user: data.user, error: error?.message ?? null };
    },

    async signUp(email: string, password: string) {
      const { data, error } = await client.auth.signUp({ email, password });
      return { user: data.user, error: error?.message ?? null };
    },

    async signOut() {
      await client.auth.signOut();
    },

    async getSession() {
      const { data } = await client.auth.getSession();
      return data.session ?? null;
    },

    async listPackingLists() {
      const user = await requireSessionUser(client);
      const { data, error } = await client
        .from("packing_lists")
        .select("id, owner_id, name, trip_type, payload, updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data as PackingListRow[]).map(mapRowToPackingList);
    },

    async upsertPackingList(input: PackingList) {
      try {
        const user = await requireSessionUser(client);
        const row = mapPackingListToRow(input, user.id);

        const { data, error } = await client
          .from("packing_lists")
          .upsert(row, { onConflict: "id" })
          .select("id, owner_id, name, trip_type, payload, updated_at")
          .single();

        if (error) {
          return { data: null, error: error.message };
        }

        return { data: mapRowToPackingList(data as PackingListRow), error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected sync failure";
        return { data: null, error: message };
      }
    }
  };
}
