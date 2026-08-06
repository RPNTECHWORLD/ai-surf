import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const db = await open({
  filename: './aisurf.db',
  driver: sqlite3.Database
});
try {
  const users = await db.all('SELECT * FROM users');
  console.log('Users in local aisurf.db:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  const matches = await db.all('SELECT * FROM users WHERE email = ?', ['rpntechworld@gmail.com']);
  console.log('Match for rpntechworld@gmail.com:', matches);
} catch (e) {
  console.error('Error reading users table from aisurf.db:', e.message);
}
await db.close();
process.exit(0);
