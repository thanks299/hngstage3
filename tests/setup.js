// Increase timeout for tests
jest.setTimeout(30000);

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/test_db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'test_client_id';
process.env.GITHUB_CLIENT_SECRET =
    process.env.GITHUB_CLIENT_SECRET || 'test_client_secret';

// Suppress console logs during tests
globalThis.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

// Clean up after all tests
afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
});