# PairPay interactive prototype — V2

Open `index.html` in a browser. The prototype is dependency-free and saves local changes in browser `localStorage` under `pairpay-v2-state`.

For a normal local web address, double-click `START-PAIRPAY.bat`. It starts PairPay at `http://127.0.0.1:4173/` and opens it in your default browser. Keep the terminal window open while testing; press `Ctrl+C` there when finished.

## What works

- A calm household dashboard with plan status, upcoming payment, contributions, shared goals, latest expenses, and a timely insight
- Unified transactions for personal spending, income, and shared activity, with search, filters, editing, and deletion
- Responsive desktop sidebar and horizontally scrollable mobile navigation covering every feature
- Searchable and filterable expense ledger with validation, payer selection, and live split preview
- Category budgets with plan-versus-actual progress and over-budget alerts
- Live fair-share studio with equal, proportional, and custom rules plus job loss, income rise, and new EMI scenarios
- Goal creation, contributions, deadline forecasts, and required-pace matching
- Explainable settlements with one net balance, underlying expenses, completion, and history
- Couple financial-health scoring, grounded insights, and interactive coach prompts
- Partner, split-default, notification, and privacy settings
- Four-step monthly money check-in that can keep, increase, or review the next plan
- Compact floating quick-add dock with `Ctrl/Cmd + K`, keyboard-visible focus, semantic controls, and reduced-motion support

## Prototype data

The seeded example uses Arjun and Mira, a ₹70,000 monthly shared plan, unequal incomes, seven expenses, and two goals. Changes persist only in the current browser. Clear site data/local storage to return to the initial state.

## Product artifacts

- `PRODUCT-BRIEF.md` explains the wedge, MVP, risks, and product choices.
- `CAPABILITY.md` defines trust boundaries, states, data implications, and open questions.
- `FEATURE-GAP-AUDIT.md` records the comparison with the reference Lovable prototype and what was added locally.

## Production next steps

1. Test this prototype with 8–12 couples and watch whether they understand the fair-share studio without explanation.
2. Improve only the highest-friction presentation flows before adding bank connections, payments, or policy screens.
3. When moving beyond a prototype, design pairing/auth, encryption, audit history, and safe pair dissolution.

