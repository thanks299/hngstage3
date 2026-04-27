const { pool } = require("../config/database");
const { Parser } = require("json2csv");

class ExportController {
  static async exportProfilesCSV(req, res) {
    try {
      const {
        gender,
        country_id,
        age_group,
        sort_by = "created_at",
        order = "DESC",
      } = req.query;

      let query = "SELECT * FROM profiles WHERE 1=1";
      const params = [];
      let paramIndex = 1;

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

      const allowedSortColumns = [
        "name",
        "age",
        "gender",
        "country_id",
        "created_at",
      ];
      const normalizedSortBy = allowedSortColumns.includes(sort_by)
        ? sort_by
        : "created_at";
      const normalizedOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      query += ` ORDER BY ${normalizedSortBy} ${normalizedOrder}`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "No profiles found to export",
        });
      }

      const fields = [
        "id",
        "name",
        "gender",
        "gender_probability",
        "age",
        "age_group",
        "country_id",
        "country_name",
        "country_probability",
        "created_at",
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(result.rows);

      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const filename = `profiles_${timestamp}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(csv);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to export profiles",
      });
    }
  }
}

module.exports = ExportController;
