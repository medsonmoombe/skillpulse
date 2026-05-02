export const discoveryIntentValues = [
  "career_growth",
  "interview_prep",
  "portfolio_building",
  "academic_support",
  "hobby_learning",
  "mentorship",
] as const;

export type DiscoveryIntent = (typeof discoveryIntentValues)[number];

export const discoveryIntentLabels: Record<DiscoveryIntent, string> = {
  career_growth: "Career growth",
  interview_prep: "Interview prep",
  portfolio_building: "Portfolio building",
  academic_support: "Academic support",
  hobby_learning: "Hobby learning",
  mentorship: "Mentorship",
};

export const discoveryIntentDescriptions: Record<DiscoveryIntent, string> = {
  career_growth: "Focused on practical skill-building that leads to stronger work opportunities.",
  interview_prep: "Preparing for interviews, assessments, and high-pressure hiring moments.",
  portfolio_building: "Trying to ship real projects, case studies, or proof of skill.",
  academic_support: "Learning around coursework, exams, and structured study goals.",
  hobby_learning: "Learning for curiosity, creativity, and personal growth.",
  mentorship: "Looking for guidance, accountability, and long-term support.",
};
