# Hardening Deviation Process Flowchart

**Visual Guide to the Hardening Deviation Process**

## Complete Process Flow

```mermaid
flowchart TD
    A[Developer Identifies<br/>Deviation Need] --> B{Can Deviation<br/>Be Avoided?}
    B -->|Yes| C[Implement<br/>Compliant Solution]
    B -->|No| D[Copy Deviation<br/>Template]
    
    D --> E[Complete Deviation<br/>Documentation]
    E --> F[Perform Risk<br/>Assessment]
    
    F --> G{Risk Level?}
    
    G -->|Critical| H1[Requires:<br/>Security + Lead +<br/>Client Approval]
    G -->|High| H2[Requires:<br/>Security + Lead<br/>Approval]
    G -->|Medium| H3[Requires:<br/>Security OR Lead<br/>Approval]
    G -->|Low| H4[Requires:<br/>Lead Approval]
    
    H1 --> I[Create PR with<br/>Deviation Label]
    H2 --> I
    H3 --> I
    H4 --> I
    
    I --> J[Security Review]
    J --> K{Approved?}
    
    K -->|No| L[Rejected:<br/>Find Alternative]
    K -->|Conditional| M[Address<br/>Conditions]
    K -->|Yes| N[Merge PR]
    
    L --> B
    M --> J
    
    N --> O[Update Deviation<br/>Registry]
    O --> P[Add Code<br/>Comments]
    P --> Q[Schedule<br/>Review]
    
    Q --> R[Implementation<br/>Complete]
    
    R --> S{Temporary?}
    S -->|Yes| T[Create Remediation<br/>Plan]
    S -->|No| U[Schedule Periodic<br/>Review]
    
    T --> U
    U --> V{Review Date<br/>Reached?}
    
    V -->|No| W[Ongoing<br/>Monitoring]
    V -->|Yes| X[Conduct Review]
    
    X --> Y{Still Needed?}
    Y -->|Yes| Z[Update Risk<br/>Assessment]
    Y -->|No| AA[Close Deviation]
    
    Z --> U
    AA --> AB[Archive<br/>Documentation]
    
    W --> V
    
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style G fill:#fff4e6
    style K fill:#fff4e6
    style R fill:#e8f5e9
    style AA fill:#e8f5e9
    style L fill:#ffebee
    style H1 fill:#ffe0e0
    style H2 fill:#fff3e0
    style H3 fill:#e8f5e9
    style H4 fill:#e8f5e9
```

## Risk-Based Approval Workflow

```mermaid
flowchart LR
    A[Deviation<br/>Submitted] --> B{Risk<br/>Level?}
    
    B -->|Critical| C1[Security<br/>Engineer]
    B -->|High| C2[Security<br/>Engineer]
    B -->|Medium| C3[Security Engineer<br/>OR<br/>Technical Lead]
    B -->|Low| C4[Technical<br/>Lead]
    
    C1 --> D1[Technical<br/>Lead]
    C2 --> D2[Technical<br/>Lead]
    
    D1 --> E1[Client<br/>Representative]
    
    E1 --> F[Approved]
    D2 --> F
    C3 --> F
    C4 --> F
    
    F --> G[Implementation]
    
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style C1 fill:#ffebee
    style C2 fill:#fff3e0
    style C3 fill:#fff9c4
    style C4 fill:#e8f5e9
    style F fill:#e8f5e9
    style G fill:#c8e6c9
```

## Deviation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Deviation
    Draft --> UnderReview: Submit PR
    
    UnderReview --> Draft: Request Changes
    UnderReview --> Rejected: Rejected
    UnderReview --> Approved: Approved
    
    Rejected --> [*]: Find Alternative
    
    Approved --> Implemented: Merge PR
    Implemented --> Active: Added to Registry
    
    Active --> UnderReview: Periodic Review
    Active --> Remediated: Fixed/Updated
    Active --> NoLongerApplicable: Obsolete
    
    Remediated --> Closed
    NoLongerApplicable --> Closed
    
    Closed --> [*]: Archived
```

## Registry Update Flow

```mermaid
flowchart TD
    A[New Deviation<br/>Approved] --> B[Update Registry:<br/>Add to Active Section]
    
    B --> C[Update Statistics]
    C --> D[Update Risk Dashboard]
    D --> E[Update Compliance Metrics]
    
    E --> F[Commit Registry<br/>Changes]
    
    G[Deviation Closed] --> H[Move to Closed<br/>Section]
    H --> C
    
    I[Quarterly Review] --> J[Review All Active<br/>Deviations]
    J --> K[Update Status<br/>& Risk Levels]
    K --> C
    
    style A fill:#e8f5e9
    style G fill:#e8f5e9
    style I fill:#fff9c4
    style F fill:#c8e6c9
    
    L[Review Date<br/>Reached] --> J
```

## Risk Assessment Decision Tree

```mermaid
flowchart TD
    A[Start Risk<br/>Assessment] --> B{What Data<br/>is Affected?}
    
    B -->|PII/PHI| C1[High Impact]
    B -->|Credentials| C1
    B -->|Business Data| C2[Medium Impact]
    B -->|Test Data| C3[Low Impact]
    
    C1 --> D{What's the<br/>Likelihood?}
    C2 --> D
    C3 --> D
    
    D -->|Very High| E1[Critical Risk]
    D -->|High| E2[High Risk]
    D -->|Medium| E3[Medium Risk]
    D -->|Low| E4[Low Risk]
    D -->|Very Low| E5[Low Risk]
    
    E1 --> F{Compensating<br/>Controls?}
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F
    
    F -->|Strong| G1[Reduce Risk<br/>by 1-2 Levels]
    F -->|Moderate| G2[Reduce Risk<br/>by 1 Level]
    F -->|Weak| G3[No Risk<br/>Reduction]
    
    G1 --> H[Final Risk Level]
    G2 --> H
    G3 --> H
    
    H --> I{Residual<br/>Risk OK?}
    
    I -->|Yes| J[Document &<br/>Submit]
    I -->|No| K[Need Better<br/>Controls or<br/>Alternative]
    
    K --> F
    
    style A fill:#e1f5ff
    style C1 fill:#ffebee
    style E1 fill:#d32f2f,color:#fff
    style E2 fill:#f57c00,color:#fff
    style E3 fill:#fbc02d
    style E4 fill:#7cb342,color:#fff
    style E5 fill:#7cb342,color:#fff
    style J fill:#4caf50,color:#fff
    style K fill:#ffebee
```

## Usage Guide

### For Developers

1. Start at **Complete Process Flow** to understand end-to-end process
2. Use **Risk Assessment Decision Tree** to determine risk level
3. Follow **Risk-Based Approval Workflow** to get required approvals

### For Security Reviewers

1. Use **Deviation Lifecycle** to track status
2. Reference **Risk-Based Approval Workflow** for approval requirements
3. Follow **Registry Update Flow** to update tracking

### For Auditors

- **Deviation Lifecycle** shows governance process
- **Registry Update Flow** demonstrates tracking
- **Risk Assessment Decision Tree** shows risk methodology

---

## Interactive Version

For an interactive version of these diagrams:

1. View this file in a Markdown viewer with Mermaid support
2. Use GitHub's Mermaid rendering
3. Use Mermaid Live Editor: https://mermaid.live/

---

**Flowcharts Version:** 1.0  
**Last Updated:** 2026-02-24  
**See Also:** [HARDENING_DEVIATION_PROCESS.md](./HARDENING_DEVIATION_PROCESS.md)
