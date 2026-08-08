import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../aquaticxsportssoftware/backend/.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected!');

    // Test a basic query on surfers
    console.log('Running query on surfers...');
    try {
      const res = await client.query(`
        SELECT s.*, 
               (SELECT COUNT(*) FROM heat_surfers hs WHERE hs.surfer_id = s.id) > 0 as is_assigned,
               (
                   SELECT STRING_AGG(DISTINCT e.event_type, ',') 
                   FROM event_surfers es
                   JOIN events e ON e.id = es.event_id
                   WHERE es.surfer_id = s.id
               ) as imported_event_types
        FROM surfers s
      `);
      console.log('Query succeeded! Rows count:', res.rows.length);
    } catch (queryErr) {
      console.error('Query failed with error:', queryErr.message);
    }

    client.release();
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

main();
