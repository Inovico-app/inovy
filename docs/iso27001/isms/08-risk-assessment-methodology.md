# Risk Assessment Methodology

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-08                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 6.1.2                 |

---

## 1. Purpose

This document defines the risk assessment methodology used by Inovy's ISMS. It establishes the systematic approach for identifying, analysing, and evaluating information security risks to determine appropriate treatment. The methodology fulfils ISO 27001:2022 Clause 6.1.2 requirements and provides a consistent, repeatable basis for the risk register (ISMS-09) and treatment decisions.

---

## 2. Risk Assessment Process Overview

Inovy's risk assessment follows an asset-based, threat-and-vulnerability approach:

```
1. Identify information assets
2. Identify threats to each asset
3. Identify vulnerabilities that threats could exploit
4. Assess likelihood of exploitation
5. Assess impact if exploitation occurs
6. Calculate risk score (Likelihood × Impact)
7. Evaluate against risk appetite
8. Determine treatment
9. Document in risk register (ISMS-09)
```

---

## 3. Asset Identification

### 3.1 Asset Categories

Inovy's information assets are categorized as follows:

| Category                  | Examples                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data assets**           | Meeting recordings (audio/video), transcripts, AI summaries, user PII (names, email addresses, Dutch BSN numbers, medical data discussed in meetings), authentication credentials, API keys |
| **Software assets**       | Inovy web application (apps/web), Next.js application code, Better Auth session management, Drizzle ORM migrations, AI processing pipeline code                                             |
| **Infrastructure assets** | Azure Container Apps instances, Neon PostgreSQL databases, Azure Blob Storage, Qdrant vector database, Redis cache, GitHub repository, GitHub Actions runners                               |
| **Service assets**        | OpenAI API, Anthropic API, Deepgram ASR service, Recall.ai recording service, Stripe payment processing, Resend email service                                                               |
| **Human assets**          | Engineering team members, their access credentials, knowledge of system architecture                                                                                                        |
| **Physical assets**       | Developer endpoint devices (laptops); no Inovy-owned servers or facilities                                                                                                                  |

### 3.2 Asset Ownership

Each asset is assigned an owner responsible for its security. Asset ownership is recorded in the asset register (maintained separately from this document per POL-03). For risk assessment purposes, the primary asset owner is consulted when assessing risk impact.

---

## 4. Threat Identification

Threats are identified from the following sources:

- **NCSC-NL threat landscape reports** — annual Dutch national cyber threat assessments
- **OWASP Top 10 (Web, API, LLM)** — applicable vulnerability patterns for web applications and AI features
- **GitHub Security Advisories and CVE database** — supply chain and dependency threats
- **Inovy incident history** — internal lessons learned
- **Industry intelligence** — SaaS-sector specific threat reports
- **Engineering team input** — developer and architect knowledge of system-specific threats
- **Supplier security disclosures** — notifications from Azure, OpenAI, Deepgram, etc.

Threat categories considered include: unauthorized access, data breaches, malware/ransomware, supply chain attacks, insider threats, denial of service, social engineering, AI-specific threats (prompt injection, PII leakage, model manipulation), and regulatory non-compliance.

---

## 5. Likelihood Scale

Likelihood is assessed on a 5-point scale representing the probability of a threat successfully exploiting a vulnerability within a 12-month period, given existing controls:

| Score | Level          | Criteria                                                                                                                                                                         |
| ----- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Rare           | Highly unlikely; requires sophisticated multi-stage attack or highly unusual circumstances. Occurs less than once per 10 years at comparable organizations.                      |
| **2** | Unlikely       | Low probability; requires non-trivial attacker capability or favourable conditions. Occurs perhaps once in several years at comparable organizations.                            |
| **3** | Possible       | Moderate probability; could occur with moderate attacker capability or common vulnerability patterns. Has occurred at comparable organizations in recent years.                  |
| **4** | Likely         | High probability; attacker with basic capability could exploit; common attack pattern actively observed in the wild. Occurs multiple times per year at comparable organizations. |
| **5** | Almost certain | Very high probability; exploitation is routine; automated scanning would find and exploit this. Occurs regularly and without sophisticated attackers.                            |

---

## 6. Impact Scale

Impact is assessed on a 5-point scale representing the consequence of successful exploitation across financial, reputational, legal/regulatory, and operational dimensions:

| Score | Level       | Financial   | Reputational                                             | Legal/Regulatory                                                                         | Operational                                                              |
| ----- | ----------- | ----------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **1** | Negligible  | <€5K loss   | Minor internal inconvenience                             | No regulatory exposure                                                                   | <1hr disruption; no customer impact                                      |
| **2** | Minor       | €5K–€25K    | Limited negative press; contained customer impact        | Minor regulatory finding; no fine                                                        | 1–4hr disruption; limited customer impact                                |
| **3** | Moderate    | €25K–€100K  | Significant negative press; customer inquiries           | Regulatory warning; potential fine                                                       | 4–24hr disruption; multiple customers affected                           |
| **4** | Significant | €100K–€500K | Major reputational damage; customer churn risk           | Regulatory investigation; substantial fine risk (up to 2% turnover)                      | 24hr–1wk disruption; SLA breach; customer escalations                    |
| **5** | Critical    | >€500K      | Severe reputational damage; potential existential threat | Major regulatory enforcement; maximum GDPR fine (4% global turnover or €20M); litigation | >1wk disruption; platform unavailability; significant customer data loss |

---

## 7. Risk Scoring

**Risk Score = Likelihood × Impact**

|                                   | **Impact 1 (Negligible)** | **Impact 2 (Minor)** | **Impact 3 (Moderate)** | **Impact 4 (Significant)** | **Impact 5 (Critical)** |
| --------------------------------- | ------------------------- | -------------------- | ----------------------- | -------------------------- | ----------------------- |
| **Likelihood 1 (Rare)**           | 1                         | 2                    | 3                       | 4                          | 5                       |
| **Likelihood 2 (Unlikely)**       | 2                         | 4                    | 6                       | 8                          | 10                      |
| **Likelihood 3 (Possible)**       | 3                         | 6                    | 9                       | 12                         | 15                      |
| **Likelihood 4 (Likely)**         | 4                         | 8                    | 12                      | 16                         | 20                      |
| **Likelihood 5 (Almost certain)** | 5                         | 10                   | 15                      | 20                         | 25                      |

---

## 8. Risk Evaluation and Appetite

### 8.1 Risk Level Bands

| Score Range | Risk Level | Default Treatment                                                                                                 |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| **1–4**     | Low        | Accept: monitor annually; no immediate action required                                                            |
| **5–9**     | Medium     | Monitor: review quarterly; apply cost-effective controls; document acceptance if no treatment                     |
| **10–15**   | High       | Treat: implement controls to reduce to Medium or Low within defined timeframe                                     |
| **16–25**   | Critical   | Immediate action: escalate to CEO/CTO; treat immediately; do not accept without explicit written CEO/CTO approval |

### 8.2 Risk Appetite Statement

Inovy's board and executive management have defined the following risk appetite:

- **Zero tolerance** for risks that would result in unauthorized disclosure of personal data requiring GDPR breach notification to the Autoriteit Persoonsgegevens
- **Zero tolerance** for Critical-rated risks (Score 16–25) that are not actively being treated
- **Low appetite** for High-rated risks (Score 10–15): all High risks must have a documented treatment plan with an assigned owner and deadline
- **Medium appetite** for Medium risks (Score 5–9): treatment required where cost-effective; formal acceptance permitted where treatment is disproportionate to residual risk
- **Accept** Low risks (Score 1–4) with periodic monitoring

---

## 9. Risk Treatment Options

For each risk evaluated above the acceptance threshold, one of four treatment options is selected:

| Treatment    | Definition                                                           | When to Apply                                                                                                                        |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Avoid**    | Eliminate the activity or condition creating the risk                | When risk is unacceptably high and the activity is not essential to the business                                                     |
| **Mitigate** | Implement controls to reduce likelihood, impact, or both             | When controls exist that can reduce risk to an acceptable level within reasonable cost and time                                      |
| **Transfer** | Share the risk with a third party (insurance, contractual liability) | When mitigation is impractical and the risk can be financially transferred (e.g., cyber insurance)                                   |
| **Accept**   | Formally accept the residual risk without additional controls        | Only for Low risks, or where Medium risk treatment is disproportionate; must be approved by ISM (Medium) or CEO/CTO (High and above) |

### 9.1 Residual Risk

After treatment, the residual risk is assessed using the same 5×5 matrix with the assumption that the planned or implemented controls are in place. Residual risk must be within risk appetite before treatment is considered complete.

---

## 10. Threat Intelligence (A.5.7)

The ISM is responsible for maintaining situational awareness of the current threat landscape as it applies to Inovy's systems and sector. The following intelligence sources are actively monitored:

| Source                                                | Type                                                                 | Monitoring Frequency                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| **NCSC-NL** (ncsc.nl)                                 | National threat reports, advisories, and vulnerability bulletins     | Weekly review; immediate action on critical advisories      |
| **GitHub Security Advisories**                        | npm package and GitHub ecosystem vulnerability disclosures           | Automated (Dependabot) + weekly manual review               |
| **OWASP Top 10 (Web, API, LLM)**                      | Established application vulnerability patterns; LLM-specific threats | Annual update review; immediate on new LLM Top 10 release   |
| **Better Auth release notes**                         | Security patches and vulnerability disclosures for the auth library  | Continuous monitoring (GitHub watch; release notifications) |
| **OpenAI / Anthropic / Deepgram security advisories** | AI service provider security communications                          | Continuous (provider security bulletins)                    |
| **CVE / NVD database**                                | Common vulnerability and exposure database                           | Automated scanning; weekly review for relevant technologies |
| **Recall.ai security advisories**                     | Recording bot service security notifications                         | Continuous (provider communications)                        |
| **Azure Security Center / Defender**                  | Azure infrastructure threat intelligence                             | Continuous (Azure Monitor alerts)                           |
| **Dutch ISAC (where applicable)**                     | Sector-specific threat sharing                                       | As available                                                |

Threat intelligence findings that suggest a new or significantly changed risk are escalated to a risk assessment review (see Section 11) and incorporated into the risk register.

---

## 11. Review Schedule

### 11.1 Monthly Review

The ISM conducts a monthly review of the risk register (ISMS-09) to:

- Update treatment plan statuses (implemented, in progress, overdue)
- Incorporate new threat intelligence
- Identify any risks approaching treatment deadlines
- Report on KPIs per ISMS-11

### 11.2 Annual Full Reassessment

A full risk assessment is conducted annually (aligned with the ISMS annual review cycle, Q1 each year) covering:

- All existing risks: re-evaluation of likelihood and impact in light of control changes and threat intelligence
- New threat identification: review of the asset base and threat landscape for new risks not previously captured
- Review of excluded risks: confirmation that risks previously accepted are still within appetite
- Update of the risk register (ISMS-09) with reassessment results

### 11.3 Triggered Reassessment

An additional risk assessment review is triggered by any of the following events:

- A confirmed security incident (post-incident, to identify new or worsened risks)
- Introduction of a significant new system, technology, or integration
- Departure from or addition to the sub-processor list
- A significant change in the regulatory environment (e.g., new AP guidance, NIS2 enforcement)
- Discovery of a critical vulnerability in a core dependency
- A material change in the threat landscape (e.g., new nation-state targeting of SaaS platforms)

Triggered reviews are scoped to the area affected by the triggering event and documented in the risk register with the triggering event reference.

---

## 12. Documentation and Records

The output of the risk assessment process is recorded in ISMS-09 (Risk Register). Risk assessment records are classified as **Confidential** and retained for a minimum of 3 years per ISMS-07.

---

## 13. Document Control

This methodology document is reviewed annually by the ISM. Amendments follow the approval workflow in ISMS-07 (Document Control Procedure).

**Next review:** 2027-03-13
