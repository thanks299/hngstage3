const { randomUUID } = require('node:crypto');
const { pool } = require('../config/database');

class Profile {
  static async findAll({ filters = {}, sort = {}, pagination = {} }) {
    const { page = 1, limit = 10 } = pagination;
    const { sort_by = 'created_at', order = 'asc' } = sort;
    
    // Validate limit (max 50)
    const validLimit = Math.min(limit, 50);
    const offset = (page - 1) * validLimit;
    
    let query = 'SELECT * FROM profiles WHERE 1=1';
    const values = [];
    let paramCounter = 1;
    
    // Build WHERE clauses
    if (filters.gender) {
      query += ` AND gender = $${paramCounter++}`;
      values.push(filters.gender);
    }
    
    if (filters.age_group) {
      query += ` AND age_group = $${paramCounter++}`;
      values.push(filters.age_group);
    }
    
    if (filters.country_id) {
      query += ` AND country_id = $${paramCounter++}`;
      values.push(filters.country_id.toUpperCase());
    }
    
    if (filters.min_age) {
      query += ` AND age >= $${paramCounter++}`;
      values.push(filters.min_age);
    }
    
    if (filters.max_age) {
      query += ` AND age <= $${paramCounter++}`;
      values.push(filters.max_age);
    }
    
    if (filters.min_gender_probability) {
      query += ` AND gender_probability >= $${paramCounter++}`;
      values.push(filters.min_gender_probability);
    }
    
    if (filters.min_country_probability) {
      query += ` AND country_probability >= $${paramCounter++}`;
      values.push(filters.min_country_probability);
    }
    
    // Get total count
    const countQuery = query.replace('*', 'COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = Number.parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    const validSortColumns = ['age', 'created_at', 'gender_probability'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    query += ` LIMIT $${paramCounter++} OFFSET $${paramCounter++}`;
    values.push(validLimit, offset);
    
    const result = await pool.query(query, values);
    
    return {
      data: result.rows,
      total,
      page,
      limit: validLimit,
      totalPages: Math.ceil(total / validLimit),
    };
  }
  
  static async seedProfiles(profiles) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const profile of profiles) {
        if (!profile || typeof profile.name !== 'string') {
          throw new Error('Invalid profile seed data: each profile must include a name string');
        }

        const id = typeof profile.id === 'string' && profile.id.trim() ? profile.id : randomUUID();

        const query = `
          INSERT INTO profiles (id, name, gender, gender_probability, age, age_group, 
                               country_id, country_name, country_probability, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (name) DO NOTHING
        `;
        
        await client.query(query, [
          id,
          profile.name.toLowerCase(),
          profile.gender,
          profile.gender_probability,
          profile.age,
          profile.age_group,
          profile.country_id,
          profile.country_name,
          profile.country_probability,
          profile.created_at || new Date().toISOString(),
        ]);
      }
      
      await client.query('COMMIT');
      console.log(`Seeded ${profiles.length} profiles`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Profile;