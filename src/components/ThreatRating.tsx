import { Box, LinearProgress, Paper, Typography, useTheme } from "@mui/material"
import badImg from "/bad.png"
import badRedImg from "/bad-red.png"
import badWhiteImg from "/bad-white.png"
import goodImg from "/good.png"
import goodGreenImg from "/good-green.png"
import goodWhiteImg from "/good-white.png"
import maybeWhiteImg from "/maybe-white.png"
import questionImg from "/question.png"
import { getThreatColor, getThreatLevelFromScore } from "../lib/threatUtils"

interface ThreatRatingProps {
  rating: number // 1-100 scale
  explanation?: string
}

export const ThreatRating = ({ rating, explanation }: ThreatRatingProps) => {
  const theme = useTheme()

  const getBannerText = (r: number): string => {
    if (r <= 30) return "Safe Zone"
    if (r <= 70) return "Be Careful"
    return "Likely a Scam"
  }

  const getBannerIcon = (r: number) => {
    const src = r <= 30 ? goodWhiteImg : r <= 70 ? maybeWhiteImg : badWhiteImg
    return (
      <Box
        component="img"
        src={src}
        alt=""
        sx={{ width: 28, height: 28, objectFit: "contain", mr: 1 }}
      />
    )
  }

  const getRatingImage = (r: number): string => {
    if (r <= 30) return goodImg
    if (r <= 70) return questionImg
    return badImg
  }

  const getActionableAdvice = (r: number): string => {
    if (r <= 30) {
      return "This content appears safe. No action needed, but always stay alert."
    }
    if (r <= 70) {
      return "Proceed carefully. Do not click links unless you are certain where they lead. Do not share personal information. When in doubt, contact the sender using a phone number you already know."
    }
    return "Do not click any links. Do not reply. Never share passwords, account numbers, or personal details. If this claims to be from your bank or government, call them directly using the number on the back of your card or their official website."
  }

  const ratingColor = getThreatColor(rating)
  const ratingText = getThreatLevelFromScore(rating)

  return (
    <Paper
      elevation={1}
      sx={{
        p: 0,
        m: "20px",
        borderRadius: 4,
        overflow: "hidden",
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: "#ffffff",
        transition: "all 0.3s ease",
      }}
    >
      {/* Top Banner */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ratingColor,
        }}
      >
        {getBannerIcon(rating)}
        <Typography variant="h6" sx={{ fontWeight: 700, color: "white" }}>
          {getBannerText(rating)}
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Rating Image */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
          <Box
            component="img"
            src={getRatingImage(rating)}
            alt={getBannerText(rating)}
            sx={{ width: 110, height: 110, objectFit: "contain" }}
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box
            component="img"
            src={goodGreenImg}
            alt="safe"
            sx={{ width: 32, height: 32, objectFit: "contain", mr: 1 }}
          />
          <LinearProgress
            variant="determinate"
            value={rating}
            sx={{
              height: 12,
              borderRadius: 6,
              width: "100%",
              backgroundColor: "rgba(0,0,0,0.1)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: ratingColor,
                borderRadius: 6,
                transition: "transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
              },
            }}
          />
          <Box
            component="img"
            src={badRedImg}
            alt="danger"
            sx={{ width: 32, height: 32, objectFit: "contain", ml: 1 }}
          />
        </Box>

        {/* Rating Caption */}
        <Typography
          variant="body2"
          align="center"
          sx={{
            mb: 2,
            fontSize: "0.9rem",
            color: theme.palette.text.secondary,
            fontStyle: "italic",
          }}
        >
          {ratingText}
        </Typography>

        {/* What should you do? */}
        <Box
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            mb: explanation ? 2 : 0,
          }}
        >
          <Box
            sx={{
              p: 1.25,
              backgroundColor: ratingColor,
              textAlign: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontSize: "0.9rem", color: "white" }}
            >
              What should you do?
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1.5,
              backgroundColor: `${ratingColor}18`,
              border: `1px solid ${ratingColor}40`,
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
            }}
          >
            <Typography variant="body2" sx={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
              {getActionableAdvice(rating)}
            </Typography>
          </Box>
        </Box>

        {/* Ai Analysis */}
        {explanation && (
          <Box
            sx={{
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 1.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: ratingColor,
                  textAlign: "center",
                  mb: 1,
                }}
              >
                Ai Analysis:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                {explanation}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  )
}
