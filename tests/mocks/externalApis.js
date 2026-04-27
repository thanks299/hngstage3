jest.mock("axios", () => ({
  get: jest.fn((url) => {
    if (url.includes("genderize")) {
      return Promise.resolve({ data: { gender: "male", probability: 0.99 } });
    }
    if (url.includes("agify")) {
      return Promise.resolve({ data: { age: 30 } });
    }
    if (url.includes("nationalize")) {
      return Promise.resolve({
        data: { country: [{ country_id: "US", probability: 0.85 }] },
      });
    }
    return Promise.reject(new Error("Not found"));
  }),
  post: jest.fn(() =>
    Promise.resolve({ data: { access_token: "mock_token" } }),
  ),
}));
