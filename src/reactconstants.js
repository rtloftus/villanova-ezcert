export const REQUIREMENTS = [
  { label: "Humanities", field: "core_humanities" },
  { label: "Philosophy", field: "core_philosophy" },
  { label: "Ethics", field: "core_ethics" },
  { label: "Math", field: "core_math" },
  { label: "Natural Science", field: "core_nat_sci" },
  { label: "Literature", field: "core_lit" },
  { label: "History", field: "core_history" },
  { label: "Social Science", field: "core_soc_sci" },
  { label: "Fine Arts", field: "core_fine_arts" },
  { label: "Theology", field: "core_theology" },
  { label: "Language", field: "core_language" },
  { label: "Diversity", field: "core_diversity" },
  { label: "Major", field: "first_major" },
  { label: "Free Electives", field: "free_electives" }
];

export const NUMERIC_FIELDS = REQUIREMENTS.map(r => r.field);

export const REVIEW_STATUSES = [
  "Not Reviewed",
  "Needs Attention",
  "Completed"
];