import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import HistoryIcon from "@mui/icons-material/History"
import badRedImg from "/bad-red.png"
import goodGreenImg from "/good-green.png"
import maybeYellowImg from "/maybe-yellow.png"
import { Box, Divider, IconButton, Paper, Tooltip, Typography } from "@mui/material"
import type { MouseEvent } from "react"
import { useEffect, useState } from "react"
import { clearHistory, deleteHistoryEntry, getHistory, type HistoryEntry } from "../lib/historyStorage"

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) {
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `Today ${hours}:${minutes}`
  }

  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

const getThreatLabel = (rating: number): string => {
  if (rating <= 30) return "Safe Zone"
  if (rating <= 70) return "Be Careful"
  return "Likely a Scam"
}

const getThreatChipColor = (rating: number): string => {
  if (rating <= 30) return "#4caf50"
  if (rating <= 70) return "#ff9800"
  return "#f44336"
}

const ThreatIcon = ({ rating }: { rating: number }) => {
  const src = rating <= 30 ? goodGreenImg : rating <= 70 ? maybeYellowImg : badRedImg
  const alt = rating <= 30 ? "safe" : rating <= 70 ? "caution" : "threat"
  return <Box component="img" src={src} alt={alt} sx={{ width: 24, height: 24, objectFit: "contain" }} />
}

const getPrimaryLabel = (entry: HistoryEntry): string => {
  const text = entry.input.subject || entry.input.title || entry.input.content
  return text.slice(0, 70)
}

const getSecondaryLabel = (entry: HistoryEntry): string | null => {
  if (entry.input.subject || entry.input.title) {
    const text = entry.input.sender || entry.input.content
    return text?.slice(0, 60) ?? null
  }
  return null
}

interface HistoryTabProps {
  onSelectEntry?: (entry: HistoryEntry) => void
}

export const HistoryTab = ({ onSelectEntry }: HistoryTabProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    getHistory().then(setHistory)
  }, [])

  const handleDelete = async (e: MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteHistoryEntry(id)
    setHistory((prev) => prev.filter((entry) => entry.id !== id))
  }

  const handleClearHistory = async () => {
    await clearHistory()
    setHistory([])
  }

  return (
    <Box sx={{ p: 2, height: "100%", boxSizing: "border-box" }}>
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pt: 2, pb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryIcon sx={{ fontSize: "1.4rem", color: "#47b1e5" }} />
          <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "text.primary" }}>Analysis History</Typography>
        </Box>
        <Tooltip title="Clear all history">
          <span>
            <IconButton size="small" onClick={handleClearHistory} disabled={history.length === 0}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Divider />

      {history.length === 0 ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <HistoryIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          <Typography variant="body2" color="text.secondary">No analysis history yet</Typography>
          <Typography variant="caption" color="text.secondary">Completed analyses will appear here</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {history.map((entry, i) => {
            const secondaryLabel = getSecondaryLabel(entry)
            const chipColor = getThreatChipColor(entry.result.threatRating)
            const typeLabel = entry.type === "email" ? "Email" : "Website"

            return (
              <Box key={entry.id}>
                <Box
                  onClick={() => onSelectEntry?.(entry)}
                  sx={{ px: 2, py: 3, cursor: "pointer", "&:hover": { backgroundColor: "rgba(0,0,0,0.03)" } }}
                >
                  {/* Top row: type + icon + label + timestamp */}
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.75 }}>
                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.25,
                        display: "inline-flex",
                        alignItems: "center",
                        border: "1.5px solid #bdbdbd",
                        borderRadius: "999px",
                        mr: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 500, lineHeight: 1.4 }}>
                        {typeLabel}
                      </Typography>
                    </Box>

                    <ThreatIcon rating={entry.result.threatRating} />

                    <Box
                      sx={{
                        ml: 0.75,
                        px: 1.25,
                        py: 0.35,
                        backgroundColor: chipColor,
                        borderRadius: "999px",
                        lineHeight: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>
                        {getThreatLabel(entry.result.threatRating)}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", whiteSpace: "nowrap" }}>
                      {formatTimestamp(entry.timestamp)}
                    </Typography>
                  </Box>

                  {/* Content row: text + delete */}
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}
                      >
                        {getPrimaryLabel(entry)}
                      </Typography>
                      {secondaryLabel && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {secondaryLabel}
                        </Typography>
                      )}
                    </Box>

                    <IconButton
                      size="small"
                      onClick={(e) => handleDelete(e, entry.id)}
                      sx={{ ml: 1, flexShrink: 0, color: "text.disabled" }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                {i < history.length - 1 && <Divider />}
              </Box>
            )
          })}
        </Box>
      )}
    </Paper>
    </Box>
  )
}
