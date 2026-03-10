import axios from "axios"
import {
  checkContentWithOpenAI,
  OPENAI_API_URL,
  safeCheckContentWithOpenAI,
} from "../lib/fraudService"
import type { EmailData, TextData } from "../types/fraudTypes"

// Mock axios to avoid actual API calls
jest.mock("axios")
const mockedAxios = axios as jest.Mocked<typeof axios>

describe("Fraud Detection Service API Integration", () => {
  const mockApiKey = "sk-test-api_key"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("checkContentWithOpenAI (email)", () => {
    const mockEmailData: EmailData = {
      sender: "test@example.com",
      subject: "Test Subject",
      content: "This is a test email content",
      timestamp: "2024-05-10T10:00:00Z",
    }

    it("should make correct API request to OpenAI", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  threatRating: 20,
                  explanation: "This email appears to be safe.",
                  flags: [],
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
      })

      await checkContentWithOpenAI(mockEmailData, mockApiKey)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        OPENAI_API_URL,
        expect.objectContaining({
          model: "gpt-3.5-turbo",
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining(mockEmailData.sender),
            }),
          ]),
        }),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockApiKey}`,
          },
        })
      )
    })

    it("should handle and transform successful OpenAI response", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  threatRating: 80,
                  explanation: "This email shows signs of fraud.",
                  flags: ["Suspicious sender", "Urgent language"],
                  confidence: 0.85,
                }),
              },
            },
          ],
        },
      })

      const result = await checkContentWithOpenAI(mockEmailData, mockApiKey)

      expect(result).toEqual({
        success: true,
        threatRating: 80,
        explanation: "This email shows signs of fraud.",
        flags: ["Suspicious sender", "Urgent language"],
        confidence: 0.85,
      })
    })

    it("should handle invalid response format from OpenAI", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  // Missing threatRating and explanation
                  flags: ["Suspicious sender"],
                }),
              },
            },
          ],
        },
      })

      try {
        await checkContentWithOpenAI(mockEmailData, mockApiKey)
        expect("should have thrown").toBe("but did not")
      } catch (error: any) {
        expect(error.message).toContain("parse fraud analysis")
      }
    })

    it("should handle API errors", async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { error: "Invalid API key" },
        },
        isAxiosError: true,
      }
      mockedAxios.post.mockRejectedValueOnce(errorResponse)
      mockedAxios.isAxiosError.mockReturnValueOnce(true)

      try {
        await checkContentWithOpenAI(mockEmailData, mockApiKey)
        expect("should have thrown").toBe("but did not")
      } catch (error: any) {
        expect(error.success).toBe(false)
        expect(error.message).toContain("401")
        expect(error.status).toBe(401)
      }
    })
  })

  describe("safeCheckContentWithOpenAI (email)", () => {
    const mockEmailData: EmailData = {
      sender: "test@example.com",
      subject: "Test Subject",
      content: "This is a test email content",
      timestamp: "2024-05-10T10:00:00Z",
    }

    it("should return successful result when API call succeeds", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  threatRating: 30,
                  explanation: "This is a safe email.",
                  flags: [],
                  confidence: 0.95,
                }),
              },
            },
          ],
        },
      })

      const [result, error] = await safeCheckContentWithOpenAI(mockEmailData, mockApiKey)

      expect(error).toBeNull()
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          threatRating: 30,
          explanation: "This is a safe email.",
        })
      )
    })

    it("should return error result when API call fails", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"))

      const [result, error] = await safeCheckContentWithOpenAI(mockEmailData, mockApiKey)

      expect(result).toBeNull()
      expect(error).toEqual(
        expect.objectContaining({
          success: false,
          message: "Network error",
        })
      )
    })
  })

  describe("checkContentWithOpenAI (text)", () => {
    const mockTextData: TextData = {
      content: "This is test content to analyze",
      timestamp: "2024-05-10T10:00:00Z",
    }

    it("should make correct API request for text analysis", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  threatRating: 10,
                  explanation: "This text appears completely benign.",
                  flags: [],
                  confidence: 0.99,
                }),
              },
            },
          ],
        },
      })

      await checkContentWithOpenAI(mockTextData, mockApiKey)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        OPENAI_API_URL,
        expect.objectContaining({
          model: "gpt-3.5-turbo",
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining(mockTextData.content),
            }),
          ]),
        }),
        expect.any(Object)
      )
    })

    it("should handle edge case with empty choices array", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { choices: [] },
      })

      try {
        await checkContentWithOpenAI(mockTextData, mockApiKey)
        expect("should have thrown").toBe("but did not")
      } catch (error: any) {
        expect(error.message).toContain("No valid response")
      }
    })
  })

  describe("safeCheckContentWithOpenAI (text)", () => {
    const mockTextData: TextData = {
      content: "This is test content to analyze",
      timestamp: "2024-05-10T10:00:00Z",
    }

    it("should handle OpenAI API errors safely", async () => {
      const openAIError = {
        success: false,
        message: "OpenAI API error: 429",
        status: 429,
        error: { message: "Rate limit exceeded" },
      }

      mockedAxios.post.mockImplementationOnce(() => {
        throw openAIError
      })

      const [result, error] = await safeCheckContentWithOpenAI(mockTextData, mockApiKey)

      expect(result).toBeNull()
      expect(error).toEqual(expect.objectContaining({ success: false }))
      if (error) {
        expect(error.message).toContain("analyzing text")
      } else {
        fail("Error should not be null")
      }
    })

    it("should handle non-OpenAI errors safely", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Unknown error occurred"))

      const [result, error] = await safeCheckContentWithOpenAI(mockTextData, mockApiKey)

      expect(result).toBeNull()
      expect(error).toEqual(
        expect.objectContaining({
          success: false,
          message: "Unknown error occurred",
        })
      )
    })
  })
})
