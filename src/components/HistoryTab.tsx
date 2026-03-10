import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import HistoryIcon from "@mui/icons-material/History"
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material"
import { useEffect, useState } from "react"
import { clearHistory, getHistory, type HistoryEntry } from "../lib/historyStorage"
import { getThreatColor } from "../lib/threatUtils"

interface HistoryTabProps {
  onSelectEntry?: (entry: HistoryEntry) => void
}

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
  return `${month}/${day}/${year}`
}

const getSubtitle = (entry: HistoryEntry): string => {
  const text = entry.input.sender || entry.input.content
  return text.slice(0, 60)
}

export const HistoryTab = ({ onSelectEntry }: HistoryTabProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const loadHistory = async () => {
    const entries = await getHistory()
    setHistory(entries)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleClearHistory = async () => {
    await clearHistory()
    setHistory([])
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            Analysis History
          </Typography>
        </Box>
        <Tooltip title="Clear history">
          <span>
            <IconButton
              size="small"
              onClick={handleClearHistory}
              disabled={history.length === 0}
              color="default"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {history.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            color: "text.secondary",
          }}
        >
          <HistoryIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          <Typography variant="body2" color="text.secondary">
            No analysis history yet
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Completed analyses will appear here
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ flex: 1, overflow: "auto" }}>
          {history.map((entry) => (
            <ListItem key={entry.id} disablePadding divider>
              <ListItemButton onClick={() => onSelectEntry?.(entry)} sx={{ py: 1, px: 2 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Chip
                        label={entry.type === "email" ? "Email" : entry.type === "url" ? "URL" : "Text"}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem", height: 18 }}
                      />
                      <Chip
                        label={`${entry.result.threatRating}`}
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          height: 18,
                          bgcolor: getThreatColor(entry.result.threatRating),
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                        {formatTimestamp(entry.timestamp)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {getSubtitle(entry)}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )
}
