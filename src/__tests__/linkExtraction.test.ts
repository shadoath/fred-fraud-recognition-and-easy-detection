import { extractLinksFromContent } from "../lib/fraudService"

describe("extractLinksFromContent", () => {
  test("extracts basic HTTP and HTTPS URLs", () => {
    const content = "Visit https://example.com and http://test.org for more info"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://example.com")
    expect(links).toContain("http://test.org")
    expect(links).toHaveLength(2)
  })

  test("extracts www URLs and adds https protocol", () => {
    const content = "Check out www.google.com and www.stackoverflow.com"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://www.google.com")
    expect(links).toContain("https://www.stackoverflow.com")
    expect(links).toHaveLength(2)
  })

  test("extracts domain-only URLs and adds https protocol", () => {
    const content = "Contact us at example.com or visit test.co.uk"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://example.com")
    expect(links).toContain("https://test.co.uk")
    expect(links).toHaveLength(2)
  })

  test("removes trailing punctuation from URLs", () => {
    const content = "Visit https://example.com, and also check https://test.org!"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://example.com")
    expect(links).toContain("https://test.org")
    expect(links).toHaveLength(2)
  })

  test("handles URLs with paths and parameters", () => {
    const content = "Login at https://secure.bank.com/login?ref=email&user=123"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://secure.bank.com/login?ref=email&user=123")
    expect(links).toHaveLength(1)
  })

  test("removes duplicate URLs", () => {
    const content = "Visit https://example.com and https://example.com again"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://example.com")
    expect(links).toHaveLength(1)
  })

  test("handles suspicious URLs commonly found in phishing emails", () => {
    const content = "Update your account at secure-bank-update.suspicious-domain.tk/login"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://secure-bank-update.suspicious-domain.tk/login")
    expect(links).toHaveLength(1)
  })

  test("returns empty array when no URLs found", () => {
    const content = "This is just plain text with no links whatsoever"
    const links = extractLinksFromContent(content)

    expect(links).toEqual([])
  })

  test("handles mixed content with various URL formats", () => {
    const content = `
      Please visit our website at https://company.com for updates.
      You can also check www.support.company.com or contact admin@company.com.
      For urgent matters, go to emergency.company.co.uk/contact?urgent=true.
      FTP files are available at ftp://files.company.com/downloads.
    `
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://company.com")
    expect(links).toContain("https://www.support.company.com")
    expect(links).toContain("https://emergency.company.co.uk/contact?urgent=true")
    expect(links).toContain("ftp://files.company.com/downloads")
    expect(links).toHaveLength(4)
  })
})
