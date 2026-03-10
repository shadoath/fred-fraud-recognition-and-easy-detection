export const getThreatColor = (rating: number): string => {
  if (rating <= 30) return "#4caf50"
  if (rating <= 70) return "#ff9800"
  return "#f44336"
}

export const getThreatLevelFromScore = (score: number): string => {
  if (score <= 10) return "Very Safe"
  if (score <= 20) return "Safe"
  if (score <= 30) return "Likely Safe"
  if (score <= 40) return "Mild Concern"
  if (score <= 50) return "Some Concern"
  if (score <= 60) return "Moderate Concern"
  if (score <= 70) return "Concerning"
  if (score <= 80) return "Highly Suspicious"
  if (score <= 90) return "Dangerous"
  return "Very Dangerous"
}
