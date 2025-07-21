import { isDevMode, devInfo, devDebug, devWarn, devError } from "../lib/devUtils"

// Mock chrome.runtime
const mockChrome = {
  runtime: {
    id: "dnmadaccmijgdbnlcplcbbknbenfmplj" // Dev extension ID
  }
}

// Mock console methods
const mockConsole = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

describe("devUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // @ts-ignore
    global.chrome = mockChrome
    // @ts-ignore
    global.console = { ...console, ...mockConsole }
  })

  afterEach(() => {
    // Clean up global mocks
    delete (global as any).chrome
  })

  describe("isDevMode", () => {
    test("returns true when extension ID matches dev ID", () => {
      mockChrome.runtime.id = "dnmadaccmijgdbnlcplcbbknbenfmplj"
      expect(isDevMode()).toBe(true)
    })

    test("returns false when extension ID does not match dev ID", () => {
      mockChrome.runtime.id = "someotherextensionid"
      expect(isDevMode()).toBe(false)
    })

    test("returns false when chrome.runtime is not available and NODE_ENV is production", () => {
      delete (global as any).chrome
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = "production"
      
      expect(isDevMode()).toBe(false)
      
      process.env.NODE_ENV = originalEnv
    })

    test("returns true in test environment", () => {
      delete (global as any).chrome
      process.env.NODE_ENV = "test"
      expect(isDevMode()).toBe(true)
    })

    test("returns true in development environment", () => {
      delete (global as any).chrome
      process.env.NODE_ENV = "development"
      expect(isDevMode()).toBe(true)
    })
  })

  describe("conditional logging functions", () => {
    test("devInfo logs when in dev mode", () => {
      mockChrome.runtime.id = "dnmadaccmijgdbnlcplcbbknbenfmplj"
      devInfo("test message", "extra param")
      
      expect(mockConsole.info).toHaveBeenCalledWith("test message", "extra param")
    })

    test("devInfo does not log when not in dev mode", () => {
      mockChrome.runtime.id = "production-id"
      devInfo("test message")
      
      expect(mockConsole.info).not.toHaveBeenCalled()
    })

    test("devDebug logs when in dev mode", () => {
      mockChrome.runtime.id = "dnmadaccmijgdbnlcplcbbknbenfmplj"
      devDebug("debug message")
      
      expect(mockConsole.debug).toHaveBeenCalledWith("debug message")
    })

    test("devDebug does not log when not in dev mode", () => {
      mockChrome.runtime.id = "production-id"
      devDebug("debug message")
      
      expect(mockConsole.debug).not.toHaveBeenCalled()
    })

    test("devWarn logs when in dev mode", () => {
      mockChrome.runtime.id = "dnmadaccmijgdbnlcplcbbknbenfmplj"
      devWarn("warning message")
      
      expect(mockConsole.warn).toHaveBeenCalledWith("warning message")
    })

    test("devWarn does not log when not in dev mode", () => {
      mockChrome.runtime.id = "production-id"
      devWarn("warning message")
      
      expect(mockConsole.warn).not.toHaveBeenCalled()
    })

    test("devError logs when in dev mode", () => {
      mockChrome.runtime.id = "dnmadaccmijgdbnlcplcbbknbenfmplj"
      devError("error message")
      
      expect(mockConsole.error).toHaveBeenCalledWith("error message")
    })

    test("devError does not log when not in dev mode", () => {
      mockChrome.runtime.id = "production-id"
      devError("error message")
      
      expect(mockConsole.error).not.toHaveBeenCalled()
    })
  })
})