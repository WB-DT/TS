# TS
ACT/CRM Stage 1
ACT/CRM Stage 1 is focused on account communication, communication outcomes, and follow-up accountability.

The legacy HTML application is a functional reference only. The reconstructed application separates structure, styling, state, API access, validation, security helpers, and interface components.

Stage 1 scope
Stage 1 includes:

Application shell
Signed-in user context
Authorized account search and selection
Selected-account context
Communication overview
Communication metrics
Log communication workflow
Communication history
Follow-ups
Metric definitions
Loading, empty, error, stale, and restricted states
Responsive desktop, tablet, and phone behavior
Permission-aware interface states
Stage 1 does not include:

Full order management
Quote creation
Billing administration
Pricing administration
Full opportunity management
Marketing automation
General CRM administration
Full case-management workflows
Account creation unless added as an approved requirement
Governing reference files
AM Master Requirements.docx
Business scope and CRM requirements
Theme Guidelines_v2.0.docx
Design system and responsive standards
ThemeStyle.json
Design-token source of truth
ThemeStyle.css
Browser-ready theme and component styles
ACT_CRM_Reconstruction_Master_Plan.docx
Reconstruction roadmap, decisions, and definitions of done
Repository structure
ACT CRM/
├── .github/
├── scripts/
│   ├── components/
│   │   ├── account-header.js
│   │   ├── account-search.js
│   │   ├── app-shell.js
│   │   ├── communication-form.js
│   │   ├── communication-history.js
│   │   ├── communication-overview.js
│   │   └── follow-up-list.js
│   ├── api.js
│   ├── app.js
│   ├── security.js
│   ├── state.js
│   └── validation.js
├── tests/
│   ├── accessibility/
│   ├── integration/
│   └── unit/
├── Test.html
├── ThemeStyle.css
├── ThemeStyle.json
└── README.md
