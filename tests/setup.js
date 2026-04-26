// Increase timeout for tests
jest.setTimeout(30000);

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