import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// prepare: false keeps queries working through Supabase's transaction pooler as well.
export const sql = postgres(url, { prepare: false, max: 5 });
