const { pool } = require('../config/database');
const CSVService = require('../services/csvService');

class ExportController {
    static async exportProfilesCSV(req, res) {
        try {
            let { gender, country_id, age_group, sort_by = 'created_at', order = 'DESC' } = req.query;
            
            let query = 'SELECT * FROM profiles WHERE 1=1';
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
            
            const allowedSortColumns = ['name', 'age', 'gender', 'country_id', 'created_at'];
            const safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
            order = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            
            query += ` ORDER BY ${safeSortBy} ${order}`;
            
            const result = await pool.query(query, params);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'No profiles found to export'
                });
            }
            
            const csv = await CSVService.generateProfilesCSV(result.rows);
            const fileName = CSVService.getFileName();
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(csv);
        } catch (error) {
            console.error('CSV export error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to export profiles'
            });
        }
    }
}

module.exports = ExportController;