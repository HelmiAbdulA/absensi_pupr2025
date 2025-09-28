import { Pool } from 'pg';

// Kita deklarasikan variabel pool di scope global, tapi biarkan kosong.
declare global {
  var pool: Pool | undefined;
}

const pool = global.pool || new Pool({
  connectionString: process.env.POSTGRES_URL,
});

if (process.env.NODE_ENV !== 'production') {
  global.pool = pool;
}

export default pool;