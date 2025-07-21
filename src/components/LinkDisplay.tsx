import LinkIcon from "@mui/icons-material/Link"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import SecurityIcon from "@mui/icons-material/Security"
import WarningIcon from "@mui/icons-material/Warning"
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material"
import { useState } from "react"

interface LinkDisplayProps {
  links: string[]
  title?: string
  variant?: "default" | "compact"
}

export const LinkDisplay = ({ links, title = "Links Found", variant = "default" }: LinkDisplayProps) => {
  const theme = useTheme()
  const [expandedLinks, setExpandedLinks] = useState<Set<number>>(new Set())

  if (!links || links.length === 0) {
    return null
  }

  const toggleLinkExpanded = (index: number) => {
    const newExpanded = new Set(expandedLinks)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedLinks(newExpanded)
  }

  const getSuspiciousColor = (url: string): string => {
    // Simple heuristics for suspicious indicators
    const suspiciousPatterns = [
      /\.tk$/i,
      /\.ml$/i,
      /\.ga$/i,
      /\.cf$/i,
      /bit\.ly/i,
      /tinyurl/i,
      /shorturl/i,
      /t\.co/i,
      /goo\.gl/i,
      /ow\.ly/i,
      /suspicious/i,
      /secure.*update/i,
      /verify.*account/i,
      /login.*urgent/i,
    ]

    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(url))
    
    if (hasSuspiciousPattern) return theme.palette.error.main
    if (url.startsWith("https://")) return theme.palette.success.main
    if (url.startsWith("http://")) return theme.palette.warning.main
    return theme.palette.text.secondary
  }

  const getSuspiciousIcon = (url: string) => {
    const suspiciousPatterns = [
      /\.tk$/i,
      /\.ml$/i,
      /\.ga$/i,
      /\.cf$/i,
      /suspicious/i,
      /secure.*update/i,
      /verify.*account/i,
    ]

    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(url))
    
    if (hasSuspiciousPattern) return <WarningIcon fontSize="small" />
    if (url.startsWith("https://")) return <SecurityIcon fontSize="small" />
    return <LinkIcon fontSize="small" />
  }

  const truncateUrl = (url: string, maxLength: number = 40): string => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength - 3) + "..."
  }

  if (variant === "compact") {
    return (
      <Box sx={{ mt: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            color: theme.palette.text.secondary,
            display: "flex",
            alignItems: "center",
            mb: 0.5,
          }}
        >
          <LinkIcon fontSize="small" sx={{ mr: 0.5 }} />
          {links.length} link{links.length !== 1 ? "s" : ""} found
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {links.slice(0, 3).map((link, index) => (
            <Chip
              key={index}
              label={truncateUrl(link, 25)}
              size="small"
              icon={getSuspiciousIcon(link)}
              sx={{
                fontSize: "0.7rem",
                height: "20px",
                backgroundColor: `${getSuspiciousColor(link)}15`,
                color: getSuspiciousColor(link),
                "& .MuiChip-icon": {
                  fontSize: "12px",
                },
              }}
            />
          ))}
          {links.length > 3 && (
            <Chip
              label={`+${links.length - 3} more`}
              size="small"
              sx={{
                fontSize: "0.7rem",
                height: "20px",
                backgroundColor: theme.palette.action.hover,
                color: theme.palette.text.secondary,
              }}
            />
          )}
        </Box>
      </Box>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1.5,
          fontWeight: 600,
          color: theme.palette.primary.main,
          display: "flex",
          alignItems: "center",
        }}
      >
        <LinkIcon sx={{ mr: 1, fontSize: "1.1rem" }} />
        {title} ({links.length})
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {links.map((link, index) => {
          const isExpanded = expandedLinks.has(index)
          const displayUrl = isExpanded ? link : truncateUrl(link, 60)
          const suspiciousColor = getSuspiciousColor(link)

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1,
                borderRadius: 1,
                backgroundColor: `${suspiciousColor}08`,
                border: `1px solid ${suspiciousColor}20`,
              }}
            >
              <Box sx={{ mr: 1, color: suspiciousColor }}>
                {getSuspiciousIcon(link)}
              </Box>

              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: suspiciousColor,
                  wordBreak: "break-all",
                  cursor: isExpanded ? "default" : "pointer",
                }}
                onClick={() => !isExpanded && toggleLinkExpanded(index)}
              >
                {displayUrl}
              </Typography>

              <Box sx={{ ml: 1, display: "flex", alignItems: "center" }}>
                {link.length > 60 && (
                  <Tooltip title={isExpanded ? "Collapse URL" : "Expand full URL"}>
                    <IconButton
                      size="small"
                      onClick={() => toggleLinkExpanded(index)}
                      sx={{
                        color: suspiciousColor,
                        "&:hover": {
                          backgroundColor: `${suspiciousColor}15`,
                        },
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 500 }}>
                        {isExpanded ? "Less" : "More"}
                      </Typography>
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title="Open link (be cautious with suspicious links)">
                  <IconButton
                    size="small"
                    onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                    sx={{
                      color: suspiciousColor,
                      ml: 0.5,
                      "&:hover": {
                        backgroundColor: `${suspiciousColor}15`,
                      },
                    }}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )
        })}
      </Box>

      {links.some(link => getSuspiciousColor(link) === theme.palette.error.main) && (
        <Box
          sx={{
            mt: 1.5,
            p: 1,
            borderRadius: 1,
            backgroundColor: `${theme.palette.error.main}10`,
            border: `1px solid ${theme.palette.error.main}30`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.error.main,
              display: "flex",
              alignItems: "center",
              fontWeight: 500,
            }}
          >
            <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
            Some links appear suspicious - exercise caution before clicking
          </Typography>
        </Box>
      )}
    </Paper>
  )
}