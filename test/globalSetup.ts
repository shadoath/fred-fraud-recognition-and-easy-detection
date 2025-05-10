/**
 * Setup file for Jest tests
 */

// Define global Chrome API mock
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
} as any;

// Setup other global mocks as needed

export default {};