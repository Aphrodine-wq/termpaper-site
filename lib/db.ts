// The database behind one small interface: Neon's HTTP driver in
// production (DATABASE_URL, or POSTGRES_URL as the Vercel integration may
// name it), PGlite in the tests.

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

/** An error with the HTTP status it should answer with. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let current: Db | undefined;

export async function db(): Promise<Db> {
  if (current) return current;
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new HttpError(503, "the gallery has no database connected yet");
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  current = {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.query(text, params)) as T[];
    },
  };
  return current;
}

/** Use this database from now on (the tests' PGlite); undefined goes back
 *  to the environment's. */
export function useDb(d: Db | undefined) {
  current = d;
}
