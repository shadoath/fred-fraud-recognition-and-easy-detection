import { Box, Theme, Typography } from "@mui/material";

interface OfflineModeBannerProps {
  theme: Theme;
  onClick: () => void;
}

/**
 * A reusable banner component that displays an offline mode notification
 * with a clickable link to add an API key
 */
export const OfflineModeBanner = ({ theme, onClick }: OfflineModeBannerProps) => {
  return (
    <Box
      sx={{
        p: 1.5,
        mx: 2,
        mt: 2,
        mb: 1,
        borderRadius: 1.5,
        backgroundColor: theme.palette.mode === "dark" 
          ? "rgba(255,193,7,0.15)" 
          : "rgba(255,193,7,0.1)",
        border: "1px solid rgba(255,193,7,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "#b2930c" }}>
        <strong>Offline Mode Active</strong> - Using pattern-matching analysis. For better results,
        <Box 
          component="span" 
          sx={{ 
            fontWeight: "bold", 
            cursor: "pointer", 
            textDecoration: "underline", 
            ml: 0.5,
            "&:hover": {
              color: "#8a6d00",
            }
          }}
          onClick={onClick}
        >
          add an API key
        </Box>.
      </Typography>
    </Box>
  );
};