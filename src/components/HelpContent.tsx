import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
  useTheme,
} from "@mui/material"

const faqs = [
  {
    question: "How do I check a suspicious email?",
    answer:
      "Open the email in Gmail, then click the Fred icon. Fred will automatically read the email and scan it for fraud. Just wait a moment for the result.",
  },
  {
    question: "How do I check a suspicious website?",
    answer:
      "Navigate to the website in your browser, then click the Fred icon and press 'Scan This Page'. Fred will analyze the page and tell you if it looks suspicious.",
  },
  {
    question: "Can Fred scan automatically?",
    answer:
      "Yes. In Settings, you can turn on 'Gmail Auto-scan' to have Fred analyze emails the moment you open them, and 'Website Auto-scan' to scan pages automatically when you open the Fred popup. Auto-scan requires a paid plan or your own API key.",
  },
  {
    question: "What do the colors mean?",
    answer:
      "Green means the content looks safe. Orange means you should be cautious. Red means it is likely a scam — do not click any links or share any information.",
  },
  {
    question: "What should I do if Fred says it's a scam?",
    answer:
      "Do not click any links. Do not reply or call any numbers listed in the message. If it claims to be from your bank, call your bank directly using the number on the back of your card. You can report scams to the FTC at ReportFraud.ftc.gov.",
  },
  {
    question: "Is my information safe?",
    answer:
      "The content you scan is sent to an AI service for analysis and is not stored by Fred. If you use your own API key, it is saved only on your device and never shared. If you use the free or paid proxy, your content is processed securely and not retained.",
  },
]

export const HelpContent = () => {
  const theme = useTheme()

  return (
    <Accordion
      defaultExpanded={false}
      disableGutters
      sx={{
        mb: 2,
        borderRadius: "8px !important",
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "none",
        backgroundColor: "#ffffff",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HelpOutlineIcon sx={{ color: theme.palette.primary.main, fontSize: "1.2rem" }} />
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>How to Use Fred</Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
        <Box>
          {faqs.map((faq) => (
            <Accordion
              key={faq.question}
              disableGutters
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "8px !important",
                mb: 1,
                "&:before": { display: "none" },
                backgroundColor: "rgba(0, 0, 0, 0.02)",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon fontSize="small" />}
                sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 1 } }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}
