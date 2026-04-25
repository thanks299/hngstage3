const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const initDatabase = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id                  UUID          PRIMARY KEY,
      name                VARCHAR(255)  UNIQUE NOT NULL,
      gender              VARCHAR(10)   CHECK (gender IN ('male', 'female')),
      gender_probability  FLOAT         NOT NULL CHECK (gender_probability >= 0 AND gender_probability <= 1),
      age                 INT           NOT NULL CHECK (age >= 0 AND age <= 150),
      age_group           VARCHAR(20)   NOT NULL CHECK (age_group IN ('child', 'teenager', 'adult', 'senior')),
      country_id          VARCHAR(2)    NOT NULL,
      country_name        VARCHAR(100)  NOT NULL,
      country_probability FLOAT         NOT NULL CHECK (country_probability >= 0 AND country_probability <= 1),
      created_at          TIMESTAMPTZ   DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_gender       ON profiles(gender)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_age          ON profiles(age)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_age_group    ON profiles(age_group)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_country_id   ON profiles(country_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_created_at   ON profiles(created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_gender_prob  ON profiles(gender_probability)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_country_prob ON profiles(country_probability)`);

  console.log('Database initialized');
};

module.exports = { pool, initDatabase };