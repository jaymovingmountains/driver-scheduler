import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const vanNames = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'Z1', 'Z2', 'Z3', 'Z4', 'Z5',
  'M1'
];

async function seed() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  for (const name of vanNames) {
    await connection.execute(
      'INSERT INTO vans (name, isActive) VALUES (?, true) ON DUPLICATE KEY UPDATE isActive = true',
      [name]
    );
    console.log(`Seeded van: ${name}`);
  }
  
  await connection.end();
  console.log('Done seeding vans!');
}

seed().catch(console.error);
