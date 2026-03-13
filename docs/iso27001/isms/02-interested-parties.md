# Interested Parties

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-02                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 4.2                   |

---

## 1. Purpose

This document identifies all interested parties (stakeholders) relevant to Inovy's Information Security Management System (ISMS), their expectations, and the information security requirements that Inovy must address. This analysis informs the scope, risk assessment, and control selection of the ISMS.

---

## 2. Methodology

Interested parties are identified as any individual, group, or organization that:

- Can affect, be affected by, or perceive itself to be affected by Inovy's information security decisions and outcomes; or
- Has regulatory, contractual, or legitimate interest in the confidentiality, integrity, or availability of information processed by Inovy.

The ISM reviews this register annually and following any material change in Inovy's business, regulatory environment, or supply chain.

---

## 3. Interested Parties Register

### 3.1 Customers (B2B Organizations)

| Field                                 | Detail                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Party**                             | B2B customer organizations using the Inovy platform                                                                                                                                                                                                                     |
| **Type**                              | External — Data Controller (in some contexts) / Data Processor relationship                                                                                                                                                                                             |
| **Nature of interest**                | Primary consumers of the platform; entrust Inovy with sensitive organizational meeting data including employee PII and confidential business discussions                                                                                                                |
| **Expectations**                      | Continuous platform availability; protection of meeting recordings and transcripts from unauthorized access; GDPR-compliant data handling; transparent incident notification; data portability and deletion on request; ISO 27001 certification as procurement evidence |
| **Information security requirements** | Contractual: Data Processing Agreement (DPA) with defined sub-processor list; SLA availability commitments; breach notification within 72 hours of discovery; data residency in the EU; right to audit or request audit evidence                                        |
| **How Inovy addresses this**          | Multi-tenant org isolation in RBAC; AES-256-GCM encryption; audit logging; GDPR tooling; EU data residency (Azure West Europe, Neon EU-Central-1); DPA template available; ISO 27001 certification in progress                                                          |

### 3.2 Employees and Engineering Team

| Field                                 | Detail                                                                                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Party**                             | Inovy employees including engineers, product managers, and executive leadership                                                                                                                                               |
| **Type**                              | Internal                                                                                                                                                                                                                      |
| **Nature of interest**                | Responsible for building, operating, and maintaining the platform; subject to security policies and procedures                                                                                                                |
| **Expectations**                      | Clear, practical security policies; security training and awareness; secure tooling and access to necessary resources; protection of their own employment data; fair and transparent procedures when security incidents occur |
| **Information security requirements** | Acceptable use policies; secure device and remote working standards; clear incident reporting procedures; role-based access to systems with least-privilege enforcement; no retaliation for good-faith incident reporting     |
| **How Inovy addresses this**          | RBAC enforces least privilege; documented policies (POL-01 through POL-20); annual security awareness training; secure remote working guidelines; defined incident reporting channel                                          |

### 3.3 Autoriteit Persoonsgegevens (Dutch Data Protection Authority)

| Field                                 | Detail                                                                                                                                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Party**                             | Autoriteit Persoonsgegevens (AP) — Dutch supervisory authority under GDPR Art. 51                                                                                                                                                                                                   |
| **Type**                              | External — Regulatory Authority                                                                                                                                                                                                                                                     |
| **Nature of interest**                | Oversight of GDPR compliance for Dutch-registered organizations and processing of EU data subjects' personal data                                                                                                                                                                   |
| **Expectations**                      | Lawful processing of personal data; implementation of appropriate technical and organizational measures (GDPR Art. 32); data breach notification within 72 hours of discovery (GDPR Art. 33); cooperation with investigations; demonstrable records of processing activities (RoPA) |
| **Information security requirements** | GDPR Articles 5, 24, 25, 28, 32, 33, 34, 35 compliance; DPAs with all sub-processors; Data Protection Impact Assessments (DPIAs) for high-risk processing; appointment of a Data Protection Officer where required                                                                  |
| **How Inovy addresses this**          | GDPR tooling (deletion, anonymization, consent, export); breach notification procedure in ISMS-14; sub-processor DPAs; Records of Processing Activities maintained; privacy-by-design in product architecture                                                                       |

### 3.4 Cloud Infrastructure and AI Service Providers

| Field                                 | Detail                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Party**                             | Microsoft Azure, Neon, Qdrant, Upstash, OpenAI, Anthropic, Deepgram, Recall.ai                                                                                                                                                                                                                             |
| **Type**                              | External — Sub-processors / Data Processors                                                                                                                                                                                                                                                                |
| **Nature of interest**                | Provide foundational infrastructure and AI capabilities upon which Inovy's platform operates                                                                                                                                                                                                               |
| **Expectations**                      | Contractual compliance with Inovy's DPA terms; adherence to their own security obligations as sub-processors; cooperation in incident investigation; advance notification of material security incidents or changes to service terms                                                                       |
| **Information security requirements** | Signed DPAs; EU data residency for primary providers (Azure West Europe, Neon EU-Central-1); SOC 2 Type II or equivalent certification; acceptable use policies; notification of security incidents affecting Inovy data; prohibition on training AI models on customer data (OpenAI, Anthropic, Deepgram) |
| **How Inovy addresses this**          | Supplier security assessments per POL-XX (supplier security policy); DPAs in place with all sub-processors; sub-processor list maintained and published to customers; annual review of supplier security posture                                                                                           |

### 3.5 ISO 27001 Certification Body

| Field                                 | Detail                                                                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Party**                             | Accredited ISO 27001 certification body (to be selected)                                                                                                                                                                         |
| **Type**                              | External — Audit and Certification                                                                                                                                                                                               |
| **Nature of interest**                | Assesses conformance of Inovy's ISMS against ISO/IEC 27001:2022 requirements                                                                                                                                                     |
| **Expectations**                      | Complete and accurate ISMS documentation; evidence of implementation and operation of controls; demonstrated continual improvement; cooperation during Stage 1 (documentation review) and Stage 2 (implementation audit)         |
| **Information security requirements** | All ISMS documents maintained and version-controlled; Statement of Applicability (ISMS-10) complete with justifications; risk register (ISMS-09) current; internal audit evidence (ISMS-12); management review records (ISMS-13) |
| **How Inovy addresses this**          | ISMS documentation suite (ISMS-01 through ISMS-14); annual internal audits; biannual management reviews; corrective action tracking (ISMS-14)                                                                                    |

### 3.6 Investors and Board

| Field                                 | Detail                                                                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Party**                             | Current and prospective investors; board of directors                                                                                                                                                                                 |
| **Type**                              | External / Internal — Financial stakeholders                                                                                                                                                                                          |
| **Nature of interest**                | Confidence in Inovy's risk management posture; protection of business assets and intellectual property; continuity of business operations; compliance reducing regulatory fine risk                                                   |
| **Expectations**                      | Mature information security governance; demonstrable risk management; business continuity planning; no material security incidents causing reputational or financial harm; ISO 27001 certification as evidence of systematic controls |
| **Information security requirements** | Regular security reporting to leadership; material incident escalation; risk register maintained; business continuity and disaster recovery planning                                                                                  |
| **How Inovy addresses this**          | Biannual management reviews including security KPIs (ISMS-13); risk register (ISMS-09); security objectives (ISMS-06); escalation procedures in incident response policy                                                              |

### 3.7 End Users and Meeting Participants

| Field                                 | Detail                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Party**                             | Individual users of the Inovy platform (employees of customer organizations) and meeting participants whose conversations are recorded                                                                                                                             |
| **Type**                              | External — Data Subjects                                                                                                                                                                                                                                           |
| **Nature of interest**                | Personal data protection; informed consent for recording; ability to exercise GDPR data subject rights; confidence that their conversations are processed lawfully and securely                                                                                    |
| **Expectations**                      | Clear consent mechanisms before recording; transparent privacy policy; ability to request data access, correction, or deletion; protection of sensitive information discussed in meetings (medical, legal, financial); no unauthorized disclosure to third parties |
| **Information security requirements** | GDPR Articles 13/14 (privacy notices); Articles 15-22 (data subject rights); explicit consent for recording where required; PII protection in AI processing; access controls preventing unauthorized viewing of recordings                                         |
| **How Inovy addresses this**          | GDPR tooling (data export, deletion, anonymization); PII detection and redaction (Dutch BSN, medical); privacy notices; consent management; RBAC controlling access to recordings per organization                                                                 |

### 3.8 Dutch Police / NCSC-NL and Law Enforcement

| Field                                 | Detail                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Party**                             | Dutch Police Cybercrime Unit; NCSC-NL (National Cyber Security Centre); relevant EU law enforcement authorities                                                                            |
| **Type**                              | External — Law Enforcement / National Security                                                                                                                                             |
| **Nature of interest**                | Cybercrime investigation; national cybersecurity threat intelligence; lawful access to data under appropriate legal process                                                                |
| **Expectations**                      | Cooperation with lawful data requests under proper legal process; incident reporting for significant cyber incidents; adherence to data retention obligations                              |
| **Information security requirements** | Defined procedure for responding to lawful access requests; ability to produce audit logs and evidence in forensic format; 72-hour incident reporting to NCSC-NL for significant incidents |
| **How Inovy addresses this**          | Legal request procedure in incident response policy; tamper-proof audit log chain; law enforcement contact details in information security policy (ISMS-04 Appendix A)                     |

---

## 4. Needs and Expectations Summary Matrix

| Interested Party            | Primary Security Need          | Key Requirement                         | Inovy Response                         |
| --------------------------- | ------------------------------ | --------------------------------------- | -------------------------------------- |
| B2B Customers               | Data protection & availability | GDPR DPA, ISO 27001 cert                | DPA, ISMS, encryption, org isolation   |
| Employees                   | Secure tools, clear policies   | Acceptable use, training                | Policy suite, RBAC, awareness training |
| Autoriteit Persoonsgegevens | GDPR compliance                | Art. 32-34 compliance                   | GDPR tooling, breach procedure         |
| Cloud/AI Providers          | Contractual DPA compliance     | Sub-processor DPAs                      | DPAs in place, annual review           |
| Certification Body          | ISMS conformance evidence      | Complete documentation + implementation | ISMS-01 to ISMS-14, SoA                |
| Investors / Board           | Risk management maturity       | Governance, continuity                  | Management reviews, risk register      |
| End Users / Data Subjects   | Privacy and consent            | Data subject rights                     | GDPR tooling, PII redaction            |
| Law Enforcement / NCSC-NL   | Lawful cooperation             | Forensic capability, reporting          | Audit logs, legal request procedure    |

---

## 5. Document Control

This register is reviewed annually by the ISM or whenever a new material interested party is identified (e.g., entry into a new market, new significant supplier, regulatory change). Updates follow the procedure defined in ISMS-07 (Document Control Procedure).

**Next review:** 2027-03-13
