# Junub Pay 🇸🇸

> **Diaspora remittance & direct bill-payment corridor for South Sudan.**

A large share of South Sudan's GDP comes from the diaspora sending money home.
Today that relies on expensive cash transfers (Western Union, MoneyGram) and
risky informal couriers — and even when cash arrives, it can be spent on
anything but the need it was meant for.

**Junub Pay** flips the model: instead of sending cash, the diaspora pays the
**bill itself** — school fees, medical invoices, utility top-ups — straight to a
verified provider. Money never becomes loose cash, fees are a fraction of the
competition, and families get a settlement receipt as proof.

---

## ✨ What it does

- **Pay bills directly** to verified South Sudanese schools, hospitals,
  utilities and government offices — funds land with the provider, not as cash.
- **Send money** to family via **MTN MoMo** and **Zain Cash** mobile-money rails.
- **USD wallet** that the diaspora tops up from a card/bank, then spends on the
  platform (top-ups are always free).
- **Transparent pricing** that deliberately undercuts traditional money transfer
  operators — a live savings calculator shows exactly how much you save vs.
  Western Union, MoneyGram, bank wires and couriers.
- **Admin operations console** for monitoring corridor volume, fees earned,
  settlement success rate, and managing the FX rate.

## 🏗️ Tech

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** with a custom South-Sudan-flag-inspired brand palette
- **Auth**: JWT sessions in httpOnly cookies, bcrypt-hashed passwords (`jose`)
- **Persistence**: atomic JSON document store (no native deps, works offline)
- **Mobile money**: MTN MoMo + Zain Cash clients modelled on their real API
  contracts (token → request → settle), simulated for the demo
- **Validation**: Zod on every API input
- **Charts**: hand-rolled SVG/CSS (no chart library)

## 🚀 Getting started

```bash
npm install
npm run seed        # creates ./data/junubpay.json with demo data
npm run dev         # http://localhost:3000
```

### Demo accounts

| Role     | Email                | Password   |
|----------|----------------------|------------|
| Diaspora | `demo@junubpay.ss`   | `demo1234` |
| Admin    | `admin@junubpay.ss`  | `admin123` |

## 🧱 Project structure

```
src/
├── app/
│   ├── page.tsx                 # marketing landing page
│   ├── (auth)/login, register   # diaspora onboarding
│   ├── dashboard/               # member app (overview, send, wallet, …)
│   ├── admin/                   # operations console
│   └── api/                     # auth, beneficiaries, providers, payments
├── components/                  # UI primitives, dashboard & admin shells
└── lib/
    ├── fees.ts                  # revenue model — undercut-the-market pricing
    ├── fx.ts                    # USD→SSP corridor + spread
    ├── mobile-money/            # MTN MoMo + Zain Cash clients
    ├── providers/               # direct bill-pay ledger rail
    ├── services/payments.ts     # orchestration: quote → debit → settle
    └── repositories.ts          # data access + double-entry wallet ledger
scripts/seed.mjs                 # realistic demo data
```

## 💰 Revenue model

Junub Pay earns a small, transparent transaction fee — not hidden FX margins.

| Flow              | Fee              |
|-------------------|------------------|
| Bill payment      | 1.8% (cap $15)   |
| Mobile money send | 2.9% (cap $18)   |
| Wallet top-up     | Free             |

Traditional MTOs cost **8–12%** all-in on this corridor. The pricing page shows
the comparison live for any amount.

## 🔐 Notes

This is a demo build: the mobile-money and provider integrations are simulated,
identity verification is mocked, and data lives in a local JSON file. The
integration contracts (auth flow, request/response shapes) are written to mirror
the real MTN MoMo and Zain Cash developer APIs so production wiring is a drop-in.

---

Built for the South Sudanese diaspora. *"Junub"* — home, south, where the heart is.
