import { extractLinksFromContent } from "../lib/fraudService"

describe("extractLinksFromContent", () => {
  // Test HTML parsing for email content
  test("extracts links from HTML email content", () => {
    const htmlContent = `
      <div>
        <p>Please click <a href="https://example.com/login">here to login</a></p>
        <p>Visit our <a href="https://support.example.com">support page</a></p>
        <img src="https://cdn.example.com/image.jpg" />
      </div>
    `
    const links = extractLinksFromContent(htmlContent, true)

    expect(links).toContain("https://example.com/login")
    expect(links).toContain("https://support.example.com")
    expect(links).toContain("https://cdn.example.com/image.jpg")
    expect(links).toHaveLength(3)
  })

  test("HTML parsing ignores javascript and mailto links", () => {
    const htmlContent = `
      <div>
        <a href="https://example.com">Valid link</a>
        <a href="javascript:alert('xss')">JS link</a>
        <a href="mailto:test@example.com">Email link</a>
        <a href="tel:+1234567890">Phone link</a>
      </div>
    `
    const links = extractLinksFromContent(htmlContent, true)

    expect(links).toContain("https://example.com")
    expect(links).toHaveLength(1)
  })

  test("falls back to text parsing for non-email content", () => {
    const htmlContent = `
      <div>
        <p>Visit https://example.com for more info</p>
      </div>
    `
    const links = extractLinksFromContent(htmlContent, false)

    expect(links).toContain("https://example.com")
    expect(links).toHaveLength(1)
  })
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
    const content = "Update your account at https://secure-bank-update.suspicious-domain.tk/login"
    const links = extractLinksFromContent(content)

    expect(links).toContain("https://secure-bank-update.suspicious-domain.tk/login")
    expect(links).toHaveLength(1)
  })

  test("returns empty array when no URLs found", () => {
    const content = "This is just plain text with no links whatsoever"
    const links = extractLinksFromContent(content)

    expect(links).toEqual([])
  })

  test("should NOT extract false positives like titles and names", () => {
    const content = "Hello Mrs.Tamayo and Mr.Sousa, today is 03.February.1971"
    const links = extractLinksFromContent(content)
    
    expect(links).toEqual([])
  })

  test("should NOT extract date patterns", () => {
    const content = "The meeting was on 15.March.2023 and 03.February.1971"
    const links = extractLinksFromContent(content)
    
    expect(links).toEqual([])
  })

  test("should NOT extract common titles", () => {
    const content = "Dr.Smith, Prof.Johnson, Sr.Rodriguez, and Jr.Wilson attended"
    const links = extractLinksFromContent(content)
    
    expect(links).toEqual([])
  })

  test("should extract real domains but not false positives", () => {
    const content = "Visit https://google.com but don't confuse it with Mrs.Anderson or 01.January.2023"
    const links = extractLinksFromContent(content)
    
    expect(links).toContain("https://google.com")
    expect(links).toHaveLength(1)
  })

  test("handles mixed content with various URL formats", () => {
    const content = `
      Please visit our website at https://company.com for updates.
      You can also check https://www.support.company.com or contact admin@company.com.
      For urgent matters, go to https://emergency.company.co.uk/contact?urgent=true.
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
