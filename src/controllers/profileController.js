const { pool } = require("../config/database");
const naturalLanguageParser = require("../services/naturalLanguageService");
const axios = require("axios");

class ProfileController {
  // Update the getAllProfiles method to include pagination links
  static async getAllProfiles(req, res) {
    try {
      let {
        page = 1,
        limit = 10,
        sort_by = "created_at",
        order = "DESC",
        gender,
        country_id,
        age_group,
        min_age,
        max_age,
      } = req.query;

      page = Number.parseInt(page);
      limit = Math.min(Number.parseInt(limit), 50);
      const offset = (page - 1) * limit;

      let query = "SELECT * FROM profiles WHERE 1=1";
      const params = [];
      let paramIndex = 1;

      // Apply filters
      if (gender) {
        query += ` AND gender = $${paramIndex++}`;
        params.push(gender);
      }
      if (country_id) {
        query += ` AND country_id = $${paramIndex++}`;
        params.push(country_id.toUpperCase());
      }
      if (age_group) {
        query += ` AND age_group = $${paramIndex++}`;
        params.push(age_group);
      }
      if (min_age) {
        query += ` AND age >= $${paramIndex++}`;
        params.push(min_age);
      }
      if (max_age) {
        query += ` AND age <= $${paramIndex++}`;
        params.push(max_age);
      }

      // Get total count
      const countQuery = query.replace("SELECT *", "SELECT COUNT(*)");
      const countResult = await pool.query(
        countQuery,
        params.slice(0, paramIndex - 1),
      );
      const total = Number.parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      // Apply sorting and pagination
      const allowedSortColumns = [
        "name",
        "age",
        "gender",
        "country_id",
        "created_at",
      ];
      const sortBy = allowedSortColumns.includes(sort_by)
        ? sort_by
        : "created_at";
      order = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      query += ` ORDER BY ${sortBy} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Build pagination links
      const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
      const queryParams = { ...req.query };
      delete queryParams.page;
      delete queryParams.limit;
      const queryString =
        Object.keys(queryParams).length > 0
          ? "&" + new URLSearchParams(queryParams).toString()
          : "";

      const links = {
        self: `${baseUrl}?page=${page}&limit=${limit}${queryString}`,
        next:
          page < totalPages
            ? `${baseUrl}?page=${page + 1}&limit=${limit}${queryString}`
            : null,
        prev:
          page > 1
            ? `${baseUrl}?page=${page - 1}&limit=${limit}${queryString}`
            : null,
      };

      res.json({
        status: "success",
        page,
        limit,
        total,
        total_pages: totalPages,
        links,
        data: result.rows,
      });
    } catch (error) {
      console.error("Get all profiles error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch profiles",
      });
    }
  }

  static async createProfile(req, res) {
    try {
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Name is required",
        });
      }

      // Check if profile exists
      const existingCheck = await pool.query(
        "SELECT * FROM profiles WHERE name = $1",
        [name.toLowerCase()],
      );

      if (existingCheck.rows.length > 0) {
        return res.status(200).json({
          status: "success",
          data: existingCheck.rows[0],
          message: "Profile already exists",
        });
      }

      // Fetch from external APIs
      const [genderData, ageData, nationalityData] = await Promise.all([
        axios.get(`https://api.genderize.io?name=${name}`),
        axios.get(`https://api.agify.io?name=${name}`),
        axios.get(`https://api.nationalize.io?name=${name}`),
      ]);

      let ageGroup = "adult";
      const age = ageData.data.age;
      if (age) {
        if (age < 13) ageGroup = "child";
        else if (age < 20) ageGroup = "teenager";
        else if (age >= 60) ageGroup = "senior";
      }

      const countryData = nationalityData.data.country[0] || {};

      const insertQuery = `
                INSERT INTO profiles (
                    id, name, gender, gender_probability,
                    age, age_group,
                    country_id, country_name, country_probability
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
                )
                RETURNING *
            `;

      const values = [
        name.toLowerCase(),
        genderData.data.gender,
        genderData.data.probability,
        age,
        ageGroup,
        countryData.country_id,
        countryData.country_id
          ? await getCountryName(countryData.country_id)
          : null,
        countryData.probability,
      ];

      const result = await pool.query(insertQuery, values);

      res.status(201).json({
        status: "success",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Create profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create profile",
      });
    }
  }

  static async getProfileById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query("SELECT * FROM profiles WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Profile not found",
        });
      }

      res.json({
        status: "success",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch profile",
      });
    }
  }

  static async deleteProfile(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        "DELETE FROM profiles WHERE id = $1 RETURNING *",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Profile not found",
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete profile",
      });
    }
  }

  static async searchProfiles(req, res) {
    try {
      const { q, page = 1, limit = 10 } = req.query;

      if (!q) {
        return res.status(400).json({
          status: "error",
          message: "Search query required",
        });
      }

      const filters = naturalLanguageParser.parseQuery(q);

      if (!filters || Object.keys(filters).length === 0) {
        return res.status(422).json({
          status: "error",
          message: "Could not parse search query. Please rephrase.",
        });
      }

      let query = "SELECT * FROM profiles WHERE 1=1";
      const params = [];
      let paramIndex = 1;

      if (filters.gender) {
        query += ` AND gender = $${paramIndex++}`;
        params.push(filters.gender);
      }
      if (filters.age_group) {
        query += ` AND age_group = $${paramIndex++}`;
        params.push(filters.age_group);
      }
      if (filters.country_id) {
        query += ` AND country_id = $${paramIndex++}`;
        params.push(filters.country_id.toUpperCase());
      }
      if (filters.min_age) {
        query += ` AND age >= $${paramIndex++}`;
        params.push(filters.min_age);
      }
      if (filters.max_age) {
        query += ` AND age <= $${paramIndex++}`;
        params.push(filters.max_age);
      }
      if (filters.min_gender_probability) {
        query += ` AND gender_probability >= $${paramIndex++}`;
        params.push(filters.min_gender_probability);
      }
      if (filters.min_country_probability) {
        query += ` AND country_probability >= $${paramIndex++}`;
        params.push(filters.min_country_probability);
      }

      const pageNum = Number.parseInt(page);
      const limitNum = Math.min(Number.parseInt(limit), 50);
      const offset = (pageNum - 1) * limitNum;

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limitNum, offset);

      const result = await pool.query(query, params);

      res.json({
        status: "success",
        data: result.rows,
        query_parsed: filters,
        page: pageNum,
        limit: limitNum,
        total: result.rows.length,
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        status: "error",
        message: "Search failed",
      });
    }
  }
}

async function getCountryName(countryCode) {
  const countries = {
    NG: "Nigeria",
    KE: "Kenya",
    GH: "Ghana",
    ZA: "South Africa",
    AO: "Angola",
    BJ: "Benin",
    CM: "Cameroon",
    ET: "Ethiopia",
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
  };
  return countries[countryCode] || countryCode;
}

module.exports = ProfileController;
