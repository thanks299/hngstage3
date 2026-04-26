function formatPaginationLinks(req, page, limit, totalPages) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const queryParams = { ...req.query };
    delete queryParams.page;
    delete queryParams.limit;
    
    const queryString = Object.keys(queryParams).length > 0 
        ? '&' + new URLSearchParams(queryParams).toString()
        : '';
    
    return {
        self: `${baseUrl}?page=${page}&limit=${limit}${queryString}`,
        next: page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}${queryString}` : null,
        prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}${queryString}` : null
    };
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function sanitizeString(str) {
    if (!str) return '';
    return str.toLowerCase().trim().replaceAll(/[^a-z0-9\s]/gi, '');
}

module.exports = {
    formatPaginationLinks,
    validateEmail,
    sanitizeString
};