import { act, renderHook, waitFor } from "@testing-library/react"
import { useGmailAutoExtract } from "../hooks/useGmailAutoExtract"

// Mock the chrome API
const mockChrome = {
  tabs: {
    query: jest.fn(),
  },
  scripting: {
    executeScript: jest.fn(),
  },
}

// @ts-ignore
global.chrome = mockChrome

describe("useGmailAutoExtract", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("should initialize with correct default state", async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com" }
    ])

    const { result } = renderHook(() => useGmailAutoExtract())
    
    // Initially starts extracting
    expect(result.current.isExtracting).toBe(true)
    expect(result.current.extractedData).toBe(null)
    expect(result.current.error).toBe(null)
    expect(result.current.isGmail).toBe(false)
    expect(typeof result.current.retryExtraction).toBe("function")

    // Wait for extraction to complete
    await waitFor(() => {
      expect(result.current.isExtracting).toBe(false)
    })
  })

  test("should handle non-Gmail tab", async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com" }
    ])

    const { result } = renderHook(() => useGmailAutoExtract())
    
    // Wait for extraction to complete
    await waitFor(() => {
      expect(result.current.isExtracting).toBe(false)
    })
    
    expect(result.current.isGmail).toBe(false)
    expect(result.current.extractedData).toBe(null)
    expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled()
  })

  test("should detect Gmail tab", async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://mail.google.com/mail/u/0/#inbox" }
    ])

    // Mock permission check to fail (no actual email content)
    mockChrome.scripting.executeScript.mockRejectedValue(new Error("Permission denied"))

    const { result } = renderHook(() => useGmailAutoExtract())
    
    // Wait for extraction to complete
    await waitFor(() => {
      expect(result.current.isExtracting).toBe(false)
    })
    
    expect(result.current.isGmail).toBe(true)
    expect(result.current.error).toBeTruthy()
  })

  test("should handle successful email extraction", async () => {
    const mockEmailData = {
      success: true,
      sender: "test@example.com",
      subject: "Test Subject",
      content: "Test content with https://example.com link",
      htmlContent: "Test content with https://example.com link",
      timestamp: "2023-01-01T00:00:00Z"
    }

    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://mail.google.com/mail/u/0/#inbox" }
    ])

    mockChrome.scripting.executeScript
      .mockResolvedValueOnce([{ result: true }]) // Permission check
      .mockResolvedValueOnce([{ result: mockEmailData }]) // Email extraction

    const { result } = renderHook(() => useGmailAutoExtract())
    
    // Wait for extraction to complete
    await waitFor(() => {
      expect(result.current.isExtracting).toBe(false)
    })
    
    expect(result.current.isGmail).toBe(true)
    expect(result.current.extractedData).toEqual({
      sender: "test@example.com",
      subject: "Test Subject", 
      content: "Test content with https://example.com link",
      htmlContent: "Test content with https://example.com link",
      timestamp: "2023-01-01T00:00:00Z",
      links: ["https://example.com"]
    })
    expect(result.current.error).toBe(null)
  })

  test("should handle extraction failure", async () => {
    const mockFailureData = {
      success: false,
      message: "Could not extract email data. Make sure you have an email open in Gmail."
    }

    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: "https://mail.google.com/mail/u/0/#inbox" }
    ])

    mockChrome.scripting.executeScript
      .mockResolvedValueOnce([{ result: true }]) // Permission check
      .mockResolvedValueOnce([{ result: mockFailureData }]) // Email extraction failure

    const { result } = renderHook(() => useGmailAutoExtract())
    
    // Wait for extraction to complete
    await waitFor(() => {
      expect(result.current.isExtracting).toBe(false)
    })
    
    expect(result.current.isGmail).toBe(true)
    expect(result.current.extractedData).toBe(null)
    expect(result.current.error).toContain("No email content found")
  })
})