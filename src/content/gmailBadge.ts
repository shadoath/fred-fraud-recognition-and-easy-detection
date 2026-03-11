// Gmail badge UI — injected into the email reading pane via shadow DOM.
// Returns an update function to change badge state after injection.

export type BadgeState =
  | { type: "button" }                                // free users: manual scan button
  | { type: "scanning" }                              // any tier running
  | { type: "tier2" }                                 // tier 2 in progress
  | { type: "safe" }                                  // no threat found
  | { type: "suspicious"; rating: number }            // threat 40–69
  | { type: "dangerous"; rating: number }             // threat ≥ 70
  | { type: "error" }                                 // scan failed

const FRED_ORANGE = "#F5A623"
const FRED_RED = "#f44336"

const css = `
  :host { display: block; }
  #bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    background: #f9f9f9;
    border-bottom: 1px solid #e0e0e0;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    font-size: 12px;
    color: #444;
    min-height: 30px;
    box-sizing: border-box;
  }
  #bar.clickable { cursor: pointer; }
  #bar.clickable:hover { background: #f0f0f0; }
  img.icon { width: 14px; height: 14px; flex-shrink: 0; }
  .dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
  .label { flex: 1; }
  .rating {
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    color: #fff;
    font-size: 11px;
  }
  button.scan-btn {
    background: ${FRED_ORANGE};
    border: none;
    border-radius: 4px;
    color: #1a1a1a;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    white-space: nowrap;
  }
  button.scan-btn:hover { background: #e09718; }
`

const renderContent = (
  shadow: ShadowRoot,
  state: BadgeState,
  iconUrl: string,
  onScanClick: () => void,
  onDetailsClick: () => void
): void => {
  const bar = shadow.getElementById("bar")!

  // Reset classes
  bar.className = ""

  let dotColor = ""
  let label = ""
  let ratingValue: number | null = null
  let ratingColor = ""
  let showButton = false
  let clickable = false

  switch (state.type) {
    case "button":
      showButton = true
      label = "FRED — click to scan for threats"
      break
    case "scanning":
      dotColor = FRED_ORANGE
      label = "FRED is scanning this email…"
      break
    case "tier2":
      dotColor = FRED_ORANGE
      label = "FRED is running a deeper check…"
      break
    case "safe":
      label = "✓ No threats detected"
      break
    case "suspicious":
      ratingValue = state.rating
      ratingColor = FRED_ORANGE
      label = "⚠ Suspicious — click for details"
      clickable = true
      break
    case "dangerous":
      ratingValue = state.rating
      ratingColor = FRED_RED
      label = "🚨 Dangerous — click for details"
      clickable = true
      break
    case "error":
      label = "FRED scan failed — try opening the popup"
      break
  }

  if (clickable) {
    bar.classList.add("clickable")
    bar.onclick = onDetailsClick
  } else {
    bar.onclick = null
  }

  bar.innerHTML = `
    <img class="icon" src="${iconUrl}" alt="FRED" />
    ${dotColor ? `<div class="dot" style="background:${dotColor}"></div>` : ""}
    <span class="label">${label}</span>
    ${ratingValue !== null ? `<span class="rating" style="background:${ratingColor}">${ratingValue}</span>` : ""}
    ${showButton ? `<button class="scan-btn" id="fred-scan-btn">Scan this email</button>` : ""}
  `

  if (showButton) {
    shadow.getElementById("fred-scan-btn")?.addEventListener("click", (e) => {
      e.stopPropagation()
      onScanClick()
    })
  }
}

export const mountBadge = (
  target: Element,
  onScanClick: () => void,
  onDetailsClick: () => void
): ((state: BadgeState) => void) => {
  const iconUrl = chrome.runtime.getURL("fred-16.png")

  const host = document.createElement("div")
  host.id = "fred-badge-host"
  const shadow = host.attachShadow({ mode: "open" })

  shadow.innerHTML = `<style>${css}</style><div id="bar"></div>`

  target.insertAdjacentElement("beforebegin", host)

  // Initial state
  renderContent(shadow, { type: "scanning" }, iconUrl, onScanClick, onDetailsClick)

  return (state: BadgeState) => {
    renderContent(shadow, state, iconUrl, onScanClick, onDetailsClick)
  }
}

export const removeBadge = (): void => {
  document.getElementById("fred-badge-host")?.remove()
}

// Inline detail panel injected below the badge when user clicks a suspicious/dangerous result
let detailPanel: HTMLElement | null = null

export const showDetailPanel = (result: {
  threatRating: number
  explanation: string
  flags: string[]
}): void => {
  removeDetailPanel()

  const host = document.getElementById("fred-badge-host")
  if (!host) return

  const panel = document.createElement("div")
  panel.id = "fred-detail-panel"
  const shadow = panel.attachShadow({ mode: "open" })

  const color = result.threatRating >= 70 ? FRED_RED : FRED_ORANGE

  const flagsHtml =
    result.flags.length > 0
      ? `<ul style="margin:8px 0 0;padding-left:16px;">${result.flags.map((f) => `<li style="margin-bottom:4px">${f}</li>`).join("")}</ul>`
      : ""

  shadow.innerHTML = `
    <style>
      :host { display: block; }
      #panel {
        padding: 12px 16px;
        background: #fff;
        border-bottom: 2px solid ${color};
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
        font-size: 13px;
        color: #333;
        line-height: 1.5;
      }
      .header {
        display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
      }
      .score-chip {
        background: ${color}; color: #fff;
        font-weight: 700; font-size: 12px;
        padding: 2px 8px; border-radius: 10px;
      }
      .title { font-weight: 600; font-size: 13px; }
      .close-btn {
        margin-left: auto; background: none; border: none;
        cursor: pointer; color: #888; font-size: 16px; padding: 0 4px;
      }
      ul { font-size: 12px; color: #555; }
    </style>
    <div id="panel">
      <div class="header">
        <span class="score-chip">${result.threatRating}/100</span>
        <span class="title">FRED Analysis</span>
        <button class="close-btn" id="close-btn">✕</button>
      </div>
      <div>${result.explanation}</div>
      ${flagsHtml}
    </div>
  `

  shadow.getElementById("close-btn")?.addEventListener("click", removeDetailPanel)

  host.insertAdjacentElement("afterend", panel)
  detailPanel = panel
}

export const removeDetailPanel = (): void => {
  detailPanel?.remove()
  detailPanel = null
}
