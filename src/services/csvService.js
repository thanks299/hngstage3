const { parseAsync } = require('json2csv');
const fs = require('node:fs').promises;
const path = require('node:path');

class CSVService {
    static async generateProfilesCSV(profiles) {
        const fields = [
            'id', 'name', 'gender', 'gender_probability',
            'age', 'age_group', 'country_id', 'country_name',
            'country_probability', 'created_at'
        ];
        
        const csv = await parseAsync(profiles, { fields });
        return csv;
    }
    
    static getFileName() {
        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
        return `profiles_${timestamp}.csv`;
    }
}

module.exports = CSVService;