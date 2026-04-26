/**
 * Natural Language Search Parser
 * Converts human queries into database filters
 * Based on your Stage 2 implementation
 */

class NaturalLanguageService {
    static parseQuery(query) {
        if (!query || typeof query !== 'string') {
            return null;
        }

        const normalizedQuery = query.toLowerCase().trim();
        const filters = {};

        Object.assign(filters, this.extractGenderFilters(normalizedQuery));
        Object.assign(filters, this.extractAgeFilters(normalizedQuery));
        Object.assign(filters, this.extractCountryFilters(normalizedQuery));
        Object.assign(filters, this.extractConfidenceFilters(normalizedQuery));
        
        // Return null if no filters were detected
        if (Object.keys(filters).length === 0) {
            return null;
        }

        return filters;
    }

    static extractGenderFilters(normalizedQuery) {
        const genderPatterns = {
            male: ['male', 'males', 'man', 'men', 'boy', 'boys'],
            female: ['female', 'females', 'woman', 'women', 'girl', 'girls']
        };

        const gender = this.findMatchKey(normalizedQuery, genderPatterns);
        return gender ? { gender } : {};
    }

    static extractAgeFilters(normalizedQuery) {
        const ageFilters = {};

        if (normalizedQuery.includes('young')) {
            ageFilters.min_age = 16;
            ageFilters.max_age = 24;
        }

        const ageGroups = {
            child: ['child', 'children'],
            teenager: ['teen', 'teens', 'teenager', 'teenagers'],
            adult: ['adult', 'adults'],
            senior: ['senior', 'seniors', 'elderly', 'old']
        };

        const ageGroup = this.findMatchKey(normalizedQuery, ageGroups);
        if (ageGroup) {
            ageFilters.age_group = ageGroup;
        }

        const aboveMatch = /(?:above|over|older than)\s+(\d+)/.exec(normalizedQuery);
        if (aboveMatch) {
            ageFilters.min_age = Number.parseInt(aboveMatch[1]);
        }

        const belowMatch = /(?:below|under|younger than)\s+(\d+)/.exec(normalizedQuery);
        if (belowMatch) {
            ageFilters.max_age = Number.parseInt(belowMatch[1]);
        }

        const rangeMatch = /(?:between\s+)?(\d+)\s+(?:to|and)\s+(\d+)/.exec(normalizedQuery);
        if (rangeMatch) {
            ageFilters.min_age = Number.parseInt(rangeMatch[1]);
            ageFilters.max_age = Number.parseInt(rangeMatch[2]);
        }

        return ageFilters;
    }

    static extractCountryFilters(normalizedQuery) {
        const countryMap = {
            'nigeria': 'NG', 'ng': 'NG',
            'kenya': 'KE', 'ke': 'KE',
            'ghana': 'GH', 'gh': 'GH',
            'south africa': 'ZA', 'za': 'ZA',
            'angola': 'AO', 'ao': 'AO',
            'benin': 'BJ', 'bj': 'BJ',
            'cameroon': 'CM', 'cm': 'CM',
            'ethiopia': 'ET', 'et': 'ET'
        };

        const fromMatch = /from\s+([a-z\s]+?)(?:\s+with|\s+and|\s+or|$)/.exec(normalizedQuery);
        if (!fromMatch) {
            return {};
        }

        const countryName = fromMatch[1].trim();
        const countryKey = Object.keys(countryMap).find(name => countryName.includes(name));

        return countryKey ? { country_id: countryMap[countryKey] } : {};
    }

    static extractConfidenceFilters(normalizedQuery) {
        if (normalizedQuery.includes('high confidence') || normalizedQuery.includes('very confident')) {
            return {
                min_gender_probability: 0.8,
                min_country_probability: 0.8
            };
        }

        if (normalizedQuery.includes('medium confidence')) {
            return {
                min_gender_probability: 0.5,
                min_country_probability: 0.5
            };
        }

        return {};
    }

    static findMatchKey(normalizedQuery, patternsMap) {
        return Object.entries(patternsMap).find(([, keywords]) =>
            keywords.some(keyword => normalizedQuery.includes(keyword))
        )?.[0] || null;
    }
}

module.exports = NaturalLanguageService;