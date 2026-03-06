import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  Typography,
  useTheme,
} from "@mui/material"

const faqs = [
  {
    question: "How do I check a suspicious email?",
    answer:
      "Click the Email tab. If you use Gmail, FRED can read the email automatically — just open the email in Gmail and click 'Extract from Tab'. Or type the sender's email address and paste the email text manually, then click 'Check For Fraud'.",
  },
  {
    question: "How do I check a suspicious link or website?",
    answer:
      "Click the URL tab, paste the web address (it usually starts with https://), and click 'Check URL'. FRED will tell you if the address looks suspicious.",
  },
  {
    question: "How do I check a suspicious text message or letter?",
    answer:
      "Click the Text tab, copy and paste the message into the text box, then click 'Check For Fraud'.",
  },
  {
    question: "What do the colors mean?",
    answer:
      "Green means the content looks safe. Orange means you should be cautious. Red means it is likely a scam — do not click any links or share any information.",
  },
  {
    question: "What should I do if FRED says it's a scam?",
    answer:
      "Do not click any links. Do not reply or call any numbers listed in the message. If it claims to be from your bank, call your bank directly using the number on the back of your card. You can report scams to the FTC at ReportFraud.ftc.gov.",
  },
  {
    question: "Is my information safe?",
    answer:
      "The text you check is sent to OpenAI's AI service for analysis. It is not stored by FRED. Your API key is saved only on your own device and never shared. OpenAI has its own privacy policy at openai.com/privacy.",
  },
]

export const HelpContent = () => {
  const theme = useTheme()

  return (
    <Card
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "none",
        backgroundColor:
          theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          pb: 1,
          borderBottom: `1px dashed ${theme.palette.divider}`,
        }}
      >
        <HelpOutlineIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
          How to Use FRED
        </Typography>
      </Box>

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
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.02)",
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
    </Card>
  )
}
