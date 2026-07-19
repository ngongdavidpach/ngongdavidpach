// Pure, client-safe provider helpers (no server-only imports).

import type { ProviderCategory } from "@/lib/types";

export function customerRefLabel(category: ProviderCategory): string {
  switch (category) {
    case "school":
      return "student ID";
    case "hospital":
      return "patient ID";
    case "utility":
      return "meter / account number";
    case "airtime":
      return "phone number";
    case "government":
      return "reference number";
  }
}

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  school: "School fees",
  hospital: "Medical",
  utility: "Utilities",
  airtime: "Airtime",
  government: "Government",
};
