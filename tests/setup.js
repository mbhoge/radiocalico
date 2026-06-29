/**
 * Jest Setup File
 * Configures test environment and global mocks
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = localStorageMock;

// Reset mocks before each test
beforeEach(() => {
  localStorage.getItem.mockClear();
  localStorage.setItem.mockClear();
  localStorage.removeItem.mockClear();
  localStorage.clear.mockClear();

  // Set up default behavior for localStorage
  const store = {};

  localStorage.getItem.mockImplementation((key) => store[key] || null);
  localStorage.setItem.mockImplementation((key, value) => {
    store[key] = String(value);
  });
  localStorage.removeItem.mockImplementation((key) => {
    delete store[key];
  });
  localStorage.clear.mockImplementation(() => {
    Object.keys(store).forEach((key) => delete store[key]);
  });
});
