// ─────────────────────────────────────────────────────────────
// Service provider ledger — direct bill payment rail.
//
// This is the core differentiator of Junub Pay: instead of sending cash to a
// person (which can be misused), the diaspora pays a *verified provider* —
// a school, hospital, utility or government office — directly. The provider's
// account is credited against a student/patient/customer reference, and the
// diaspora member receives a settlement receipt they can share with family.
//
// In production this integrates with each provider's billing system (ERP, Bursar,
// hospital management system) or a shared settlement bank account. Here it is
// simulated against the same provider records the UI exposes.
// ─────────────────────────────────────────────────────────────

import { getDb } from "../db";
import type { ProviderCategory, ServiceProvider } from "../types";
import { customerRefLabel } from "./labels";

export { customerRefLabel };

export interface ProviderPaymentRequest {
  providerId: string;
  amountSsp: number;
  customerRef: string; // e.g. student ID, patient ID, meter number
  payerName: string;
  narrative: string;
}

export interface ProviderPaymentResult {
  ok: boolean;
  provider?: ServiceProvider;
  settlementRef: string;
  status: "success" | "failed";
  message: string;
}

export async function getProviders(category?: ProviderCategory): Promise<ServiceProvider[]> {
  const db = await getDb();
  return db.providers
    .filter((p) => (category ? p.category === category : true))
    .sort((a, b) => Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name));
}

export async function postProviderPayment(
  req: ProviderPaymentRequest,
): Promise<ProviderPaymentResult> {
  const db = await getDb();
  const provider = db.providers.find((p) => p.id === req.providerId);
  if (!provider) {
    return {
      ok: false,
      settlementRef: "",
      status: "failed",
      message: "Unknown service provider",
    };
  }
  if (!req.customerRef.trim()) {
    return {
      ok: false,
      provider,
      settlementRef: "",
      status: "failed",
      message: `A ${customerRefLabel(provider.category)} is required`,
    };
  }

  // Simulate settlement against the provider's ledger.
  await new Promise((r) => setTimeout(r, 320));
  const roll = Math.random();
  if (roll < 0.02) {
    return {
      ok: false,
      provider,
      settlementRef: `RJ-${Date.now().toString(36)}`,
      status: "failed",
      message: `${provider.name} could not locate reference "${req.customerRef}"`,
    };
  }
  return {
    ok: true,
    provider,
    settlementRef: `STL-${Date.now().toString(36).toUpperCase()}`,
    status: "success",
    message: `Credited to ${provider.name} account ${provider.accountRef} for ${req.customerRef}`,
  };
}