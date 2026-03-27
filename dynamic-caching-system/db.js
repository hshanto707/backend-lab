import { pool } from 'pg';

const db = new pool({
  user: 'hshanto707',
  host: 'localhost',
  database: 'backend_lab',
  password: '21922192',
  port: 5432,
});

export default db;