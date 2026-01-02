# SSD Security Compliance - Remaining User Stories

This document contains all remaining user stories for the SSD (Secure Software Development) norms that need to be imported into Linear once the workspace is upgraded.

## How to Import into Linear

### Option 1: Manual Creation (Recommended for Milestones)

1. **Create Milestones First** (if not already existing):

   - Go to your project: [Inovy Security & Privacy Compliance](https://linear.app/inovico/project/inovy-security-and-privacy-compliance-e88ae07c5f86)
   - Click on "Milestones" in the project sidebar
   - Create each milestone listed below (e.g., "SSD-15: Scheiding Presentatie, Applicatie en Gegevens")

2. **Create Issues**:
   - Click "New Issue" or press `C`
   - Copy the title and description from each story below
   - Assign to the correct milestone
   - Add the appropriate label (e.g., `SSD-15`)

### Option 2: Bulk Import via CSV

Linear supports CSV import. You can convert this document to CSV format:

1. Go to Settings → Import/Export → Import from CSV
2. Map columns: Title, Description, Milestone, Labels

### Option 3: Linear API

Use the Linear API to programmatically create issues:

```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { issueCreate(input: { title: \"...\", description: \"...\", teamId: \"344c571f-6a9b-4dcb-9b1d-3e69d7ec7b99\", projectId: \"4ede9820-d495-45bf-a083-adc228cc9e20\" }) { issue { id } } }"}'
```

---

## Milestones to Create

Create these milestones in your Linear project if they don't exist:

| Milestone Name                                        | SSD Norm |
| ----------------------------------------------------- | -------- |
| SSD-15: Scheiding Presentatie, Applicatie en Gegevens | SSD-15   |
| SSD-17: Gescheiden beheerinterface                    | SSD-17   |
| SSD-21: Beperkte commando/query-toegang               | SSD-21   |
| SSD-22: Invoer-validatie                              | SSD-22   |
| SSD-23: Beperkte file includes                        | SSD-23   |
| SSD-24: Beperking HTTP-headers                        | SSD-24   |
| SSD-26: Beperkte HTTP-methoden                        | SSD-26   |
| SSD-27: Discrete foutmeldingen                        | SSD-27   |
| SSD-28: Discreet commentaar                           | SSD-28   |
| SSD-29: Voorkom directory listing                     | SSD-29   |
| SSD-31: Standaard stack                               | SSD-31   |
| SSD-32: Bescherming tegen XXE                         | SSD-32   |
| SSD-33: Veilige HTTP response headers                 | SSD-33   |

---

## User Stories

---

### Milestone: SSD-21: Beperkte commando/query-toegang

#### [SSD-21.2.02] Avoid direct data access to backend systems

**Labels:** `SSD-21`

**Description:**

**As a** developer,
**I want** direct data access to backend systems avoided,
**So that** access is controlled through application layer.

## Acceptance Criteria

- [ ] No direct database access from client
- [ ] All access through API layer
- [ ] Backend access restricted

## SSD Reference

- **Norm:** SSD-21
- **Category:** Strikt noodzakelijk
- **Number:** 2.02
- **Original (NL):** Directe data-toegang tot backend-systemen is ongewenst en alleen toegestaan indien andere opties niet voor handen zijn.

## Current Implementation Status

- All database access via server actions
- No client-side database connections
- API layer enforces access control

---

### Milestone: SSD-22: Invoer-validatie

#### [SSD-22.1.01] Reject or neutralize invalid input server-side

**Labels:** `SSD-22`

**Description:**

**As a** developer,
**I want** invalid input rejected or neutralized server-side,
**So that** only valid data is processed.

## Acceptance Criteria

- [ ] Server-side validation for all inputs
- [ ] Invalid input rejected with error
- [ ] Malicious input neutralized

## SSD Reference

- **Norm:** SSD-22
- **Category:** Valideren
- **Number:** 1.01
- **Original (NL):** Foute, ongeldige of verboden invoer wordt geweigerd of onschadelijk gemaakt. De (web)applicatie voert deze controle van de invoer uit aan de serverzijde en vertrouwt niet op de maatregelen aan de client-zijde.

## Current Implementation Status

- Zod validation on all server actions
- Server-side validation enforced
- Client validation as convenience only

```typescript
// apps/web/src/lib/server-action-client/action-client.ts
const validationResult = schema.safeParse(input);
if (!validationResult.success) {
  return err(ActionErrors.validation(...));
}
```

---

#### [SSD-22.1.02] Validate all user input

**Labels:** `SSD-22`

**Description:**

**As a** developer,
**I want** all user input validated,
**So that** no unvalidated data enters the system.

## Acceptance Criteria

- [ ] All input fields validated
- [ ] Validation rules appropriate for data type
- [ ] Comprehensive coverage

## SSD Reference

- **Norm:** SSD-22
- **Category:** Valideren
- **Number:** 1.02
- **Original (NL):** De (web)applicatie valideert alle invoer die de gebruiker aan de (web)applicatie verstrekt.

## Current Implementation Status

- Zod schemas for all API inputs
- Form validation with React Hook Form
- Type-safe input handling

---

#### [SSD-22.1.03] Validate all external system input

**Labels:** `SSD-22`

**Description:**

**As a** developer,
**I want** all external system input validated,
**So that** data from integrations is safe.

## Acceptance Criteria

- [ ] API responses validated
- [ ] Webhook payloads validated
- [ ] External data sanitized

## SSD Reference

- **Norm:** SSD-22
- **Category:** Valideren
- **Number:** 1.03
- **Original (NL):** De (web)applicatie valideert alle invoer die het van externe systemen ontvangt.

## Current Implementation Status

- External API responses type-checked
- Webhook signature verification
- Input schemas for external data

---

#### [SSD-22.1.04] Use allowlist over denylist for validation

**Labels:** `SSD-22`

**Description:**

**As a** developer,
**I want** allowlist validation used over denylist,
**So that** only known-good input is accepted.

## Acceptance Criteria

- [ ] Allowlist approach for input validation
- [ ] Explicit allowed values defined
- [ ] Denylist only as supplementary

## SSD Reference

- **Norm:** SSD-22
- **Category:** Valideren
- **Number:** 1.04
- **Original (NL):** Als onderdeel van de validatie van invoer gebruiken (web)applicaties een allowlist-benadering in plaats van denylist.

## Current Implementation Status

- Zod enums for allowed values
- Explicit type definitions
- Validation schemas define allowed patterns

---

#### [SSD-22.1.05] Validate file uploads for type and content

**Labels:** `SSD-22`

**Description:**

**As a** developer,
**I want** file uploads validated for type and content,
**So that** malicious files are blocked.

## Acceptance Criteria

- [ ] File type validation (MIME type)
- [ ] Content inspection where possible
- [ ] Size limits enforced

## SSD Reference

- **Norm:** SSD-22
- **Category:** Valideren
- **Number:** 1.05
- **Original (NL):** Bij het uploaden van bestanden valideert de (web)applicatie of type en inhoud met elkaar overeenkomen.

## Current Implementation Status

- File type validation in upload handlers
- MIME type checking
- Size limits in `apps/web/src/features/recordings/actions/upload-recording.ts`

---

### Milestone: SSD-15: Scheiding Presentatie, Applicatie en Gegevens

#### [SSD-15.1.01] Separate presentation, application, and data layers

**Labels:** `SSD-15`

**Description:**

**As a** developer,
**I want** presentation, application, and data layers separated,
**So that** architecture is secure and maintainable.

## Acceptance Criteria

- [ ] Clear layer separation in architecture
- [ ] No direct data access from presentation
- [ ] Business logic in application layer

## SSD Reference

- **Norm:** SSD-15
- **Category:** Scheiding van lagen
- **Number:** 1.01
- **Original (NL):** De scheiding in presentatie-, applicatie- en datalaag is ten minste logisch aanwezig.

## Current Implementation Status

- Next.js with React for presentation
- Server actions for application logic
- Drizzle ORM for data access

---

#### [SSD-15.1.02] Logical separation for high-risk applications

**Labels:** `SSD-15`

**Description:**

**As a** developer,
**I want** at least logical separation for high-risk applications,
**So that** security requirements are met.

## Acceptance Criteria

- [ ] Risk assessment performed
- [ ] Separation level appropriate for risk
- [ ] Documented architecture decisions

## SSD Reference

- **Norm:** SSD-15
- **Category:** Scheiding van lagen
- **Number:** 1.02
- **Original (NL):** De scheiding is ten minste logisch aanwezig voor hoog-risico applicaties.

## Current Implementation Status

- Clear separation between client and server
- Server components for sensitive operations
- API boundaries well-defined

---

#### [SSD-15.1.03] Data layer accessible only via application layer

**Labels:** `SSD-15`

**Description:**

**As a** developer,
**I want** data layer accessible only via application layer,
**So that** direct database access is prevented.

## Acceptance Criteria

- [ ] No direct database access from presentation
- [ ] All queries go through service/repository layer
- [ ] Access patterns enforced by architecture

## SSD Reference

- **Norm:** SSD-15
- **Category:** Scheiding van lagen
- **Number:** 1.03
- **Original (NL):** De datalaag is alleen bereikbaar via de applicatielaag.

## Current Implementation Status

- Data access layer in `apps/web/src/server/data-access/`
- No client-side database connections
- Server actions as API boundary

---

#### [SSD-15.1.04] Enforce layer separation at network level for high risk

**Labels:** `SSD-15`

**Description:**

**As a** developer,
**I want** layer separation enforced at network level for high-risk applications,
**So that** physical isolation provides additional security.

## Acceptance Criteria

- [ ] Network segmentation where required
- [ ] Firewall rules enforce separation
- [ ] Physical/network isolation documented

## SSD Reference

- **Norm:** SSD-15
- **Category:** Scheiding van lagen
- **Number:** 1.04
- **Original (NL):** Voor hoog-risico applicaties wordt de scheiding tussen presentatie-, applicatie- en datalaag afgedwongen op netwerkniveau.

## Current Implementation Status

- Vercel edge network for presentation
- Neon Postgres with private networking
- Connection strings use secure endpoints

---

### Milestone: SSD-17: Gescheiden beheerinterface

#### [SSD-17.1.01] Separate admin interface for system management

**Labels:** `SSD-17`

**Description:**

**As a** developer,
**I want** a separate admin interface for system management,
**So that** administrative functions are isolated.

## Acceptance Criteria

- [ ] Admin interface separate from user interface
- [ ] Different access controls for admin
- [ ] Admin actions audited

## SSD Reference

- **Norm:** SSD-17
- **Category:** Interface
- **Number:** 1.01
- **Original (NL):** Voor het beheer van het systeem is een gescheiden beheerinterface ingericht.

## Current Implementation Status

- Admin interface at `/admin` route
- Superadmin role required for access
- Separate components in `apps/web/src/app/(main)/admin/`

---

#### [SSD-17.1.02] Admin interface not publicly accessible

**Labels:** `SSD-17`

**Description:**

**As a** developer,
**I want** admin interface not publicly accessible,
**So that** attack surface is reduced.

## Acceptance Criteria

- [ ] Admin routes protected
- [ ] Authentication required
- [ ] Authorization checked

## SSD Reference

- **Norm:** SSD-17
- **Category:** Interface
- **Number:** 1.02
- **Original (NL):** De beheerinterface is niet publiekelijk toegankelijk.

## Current Implementation Status

- Auth middleware protects admin routes
- Role check for superadmin/admin
- Redirects unauthorized users

---

#### [SSD-17.1.03] Additional authentication for admin interface

**Labels:** `SSD-17`

**Description:**

**As a** developer,
**I want** additional authentication for admin interface,
**So that** privileged access is better protected.

## Acceptance Criteria

- [ ] Additional auth step for admin access
- [ ] MFA consideration for admin users
- [ ] Session requirements stricter

## SSD Reference

- **Norm:** SSD-17
- **Category:** Interface
- **Number:** 1.03
- **Original (NL):** Voor toegang tot de beheerinterface is aanvullende authenticatie vereist.

## Current Implementation Status

- Standard authentication required
- Passkey support available for stronger auth
- Additional MFA could be implemented

---

#### [SSD-17.1.04] Audit all admin interface actions

**Labels:** `SSD-17`

**Description:**

**As a** developer,
**I want** all admin interface actions audited,
**So that** administrative changes are traceable.

## Acceptance Criteria

- [ ] All admin actions logged
- [ ] Audit includes user, action, timestamp
- [ ] Logs tamper-resistant

## SSD Reference

- **Norm:** SSD-17
- **Category:** Interface
- **Number:** 1.04
- **Original (NL):** Alle acties in de beheerinterface worden gelogd.

## Current Implementation Status

- Audit logging for admin actions
- Hash chain for tamper-proofing
- Admin operations tracked

---

#### [SSD-17.1.05] Network separation for admin interface in high-risk

**Labels:** `SSD-17`

**Description:**

**As a** developer,
**I want** network separation for admin interface in high-risk applications,
**So that** admin access is isolated at network level.

## Acceptance Criteria

- [ ] Network segmentation evaluated
- [ ] Admin access from restricted networks
- [ ] VPN or IP restrictions where needed

## SSD Reference

- **Norm:** SSD-17
- **Category:** Interface
- **Number:** 1.05
- **Original (NL):** Voor hoog-risico applicaties is de beheerinterface gescheiden op netwerkniveau.

## Current Implementation Status

- Currently accessible via standard routes
- IP restrictions possible via Vercel
- VPN access not yet implemented

---

### Milestone: SSD-23: Beperkte file includes

#### [SSD-23.1.01] Prevent user-controlled file paths

**Labels:** `SSD-23`

**Description:**

**As a** developer,
**I want** user-controlled file paths prevented,
**So that** path traversal attacks are blocked.

## Acceptance Criteria

- [ ] No user input in file paths
- [ ] Path validation if unavoidable
- [ ] Sandboxed file access

## SSD Reference

- **Norm:** SSD-23
- **Category:** Voorkomen path traversal
- **Number:** 1.01
- **Original (NL):** De applicatie voorkomt dat de gebruiker invloed kan uitoefenen op het pad naar de in te lezen bestanden.

## Current Implementation Status

- File uploads use generated paths
- No user-controlled file paths
- Vercel Blob handles file storage

---

#### [SSD-23.1.02] Validate file paths server-side

**Labels:** `SSD-23`

**Description:**

**As a** developer,
**I want** file paths validated server-side,
**So that** path traversal is prevented.

## Acceptance Criteria

- [ ] Server-side path validation
- [ ] Canonicalization of paths
- [ ] Reject suspicious patterns

## SSD Reference

- **Norm:** SSD-23
- **Category:** Voorkomen path traversal
- **Number:** 1.02
- **Original (NL):** De (web)applicatie valideert bestandspaden aan de serverzijde.

## Current Implementation Status

- No direct file system access
- Cloud storage with URL-based access
- Signed URLs for file access

---

#### [SSD-23.1.03] Restrict file access to allowed directories

**Labels:** `SSD-23`

**Description:**

**As a** developer,
**I want** file access restricted to allowed directories,
**So that** unauthorized file access is prevented.

## Acceptance Criteria

- [ ] Allowed directories defined
- [ ] Access outside directories blocked
- [ ] Chroot/jail where applicable

## SSD Reference

- **Norm:** SSD-23
- **Category:** Voorkomen path traversal
- **Number:** 1.03
- **Original (NL):** De (web)applicatie beperkt de toegang tot bestanden tot toegestane directories.

## Current Implementation Status

- Vercel Blob storage isolates files
- No local file system access
- Files accessed via secure URLs

---

#### [SSD-23.1.04] Prevent symbolic link exploitation

**Labels:** `SSD-23`

**Description:**

**As a** developer,
**I want** symbolic link exploitation prevented,
**So that** file system attacks are blocked.

## Acceptance Criteria

- [ ] Symlink following disabled
- [ ] File access checks actual path
- [ ] Restricted file operations

## SSD Reference

- **Norm:** SSD-23
- **Category:** Voorkomen path traversal
- **Number:** 1.04
- **Original (NL):** De (web)applicatie voorkomt misbruik van symbolic links.

## Current Implementation Status

- Cloud storage doesn't use symlinks
- Serverless functions have no file system
- N/A for current architecture

---

### Milestone: SSD-24: Beperking HTTP-headers

#### [SSD-24.1.01] Set security headers by default

**Labels:** `SSD-24`

**Description:**

**As a** developer,
**I want** security headers set by default,
**So that** common attacks are prevented.

## Acceptance Criteria

- [ ] Security headers configured
- [ ] Headers applied to all responses
- [ ] Configuration documented

## SSD Reference

- **Norm:** SSD-24
- **Category:** Security headers
- **Number:** 1.01
- **Original (NL):** De applicatie stuurt standaard beveiligingsheaders mee.

## Current Implementation Status

- CORS headers in `apps/web/src/proxy.ts`
- Vercel default security headers
- Additional headers configurable

---

#### [SSD-24.1.02] Set X-Content-Type-Options header

**Labels:** `SSD-24`

**Description:**

**As a** developer,
**I want** X-Content-Type-Options header set,
**So that** MIME sniffing attacks are prevented.

## Acceptance Criteria

- [ ] X-Content-Type-Options: nosniff
- [ ] Applied to all responses
- [ ] Verified in testing

## SSD Reference

- **Norm:** SSD-24
- **Category:** Security headers
- **Number:** 1.02
- **Original (NL):** De applicatie stuurt de X-Content-Type-Options header mee.

## Current Implementation Status

- Configure in `vercel.json` or Next.js config
- Vercel may set by default

---

#### [SSD-24.1.03] Set X-Frame-Options header

**Labels:** `SSD-24`

**Description:**

**As a** developer,
**I want** X-Frame-Options header set,
**So that** clickjacking attacks are prevented.

## Acceptance Criteria

- [ ] X-Frame-Options: DENY or SAMEORIGIN
- [ ] Applied to all HTML responses
- [ ] CSP frame-ancestors as alternative

## SSD Reference

- **Norm:** SSD-24
- **Category:** Security headers
- **Number:** 1.03
- **Original (NL):** De applicatie stuurt de X-Frame-Options header mee.

## Current Implementation Status

- Configure in security headers
- CSP can provide equivalent protection

---

#### [SSD-24.1.04] Set Content-Security-Policy header

**Labels:** `SSD-24`

**Description:**

**As a** developer,
**I want** Content-Security-Policy header set,
**So that** XSS and injection attacks are mitigated.

## Acceptance Criteria

- [ ] CSP policy defined
- [ ] Restricts script/style sources
- [ ] Reports violations

## SSD Reference

- **Norm:** SSD-24
- **Category:** Security headers
- **Number:** 1.04
- **Original (NL):** De applicatie stuurt de Content-Security-Policy header mee.

## Current Implementation Status

- CSP can be configured in Next.js
- Report-URI for violation monitoring

---

#### [SSD-24.1.05] Set Strict-Transport-Security header

**Labels:** `SSD-24`

**Description:**

**As a** developer,
**I want** Strict-Transport-Security header set,
**So that** HTTPS is enforced.

## Acceptance Criteria

- [ ] HSTS header configured
- [ ] Max-age appropriate (1 year recommended)
- [ ] includeSubDomains if applicable

## SSD Reference

- **Norm:** SSD-24
- **Category:** Security headers
- **Number:** 1.05
- **Original (NL):** De applicatie stuurt de Strict-Transport-Security header mee.

## Current Implementation Status

- Vercel enforces HTTPS
- HSTS should be explicitly configured

---

### Milestone: SSD-26: Beperkte HTTP-methoden

#### [SSD-26.1.01] Allow only required HTTP methods

**Labels:** `SSD-26`

**Description:**

**As a** developer,
**I want** only required HTTP methods allowed,
**So that** attack surface is minimized.

## Acceptance Criteria

- [ ] Allowed methods defined per endpoint
- [ ] Unused methods return 405
- [ ] OPTIONS handled appropriately

## SSD Reference

- **Norm:** SSD-26
- **Category:** HTTP-methoden
- **Number:** 1.01
- **Original (NL):** De applicatie staat alleen de benodigde HTTP-methoden toe.

## Current Implementation Status

- Next.js API routes define allowed methods
- CORS preflight handled
- Default behavior restricts methods

---

#### [SSD-26.1.02] Reject unsupported HTTP methods

**Labels:** `SSD-26`

**Description:**

**As a** developer,
**I want** unsupported HTTP methods rejected,
**So that** invalid requests are blocked.

## Acceptance Criteria

- [ ] 405 Method Not Allowed returned
- [ ] Allow header indicates valid methods
- [ ] Consistent behavior across endpoints

## SSD Reference

- **Norm:** SSD-26
- **Category:** HTTP-methoden
- **Number:** 1.02
- **Original (NL):** De applicatie weigert niet-ondersteunde HTTP-methoden.

## Current Implementation Status

- Next.js returns 405 for unsupported methods
- API routes explicitly define handlers

---

#### [SSD-26.1.03] Handle OPTIONS requests for CORS

**Labels:** `SSD-26`

**Description:**

**As a** developer,
**I want** OPTIONS requests handled for CORS,
**So that** cross-origin requests work correctly.

## Acceptance Criteria

- [ ] OPTIONS preflight handled
- [ ] CORS headers in response
- [ ] No unnecessary processing

## SSD Reference

- **Norm:** SSD-26
- **Category:** HTTP-methoden
- **Number:** 1.03
- **Original (NL):** De applicatie handelt OPTIONS-verzoeken af voor CORS.

## Current Implementation Status

- CORS handling in `apps/web/src/proxy.ts`
- Access-Control headers configured

---

### Milestone: SSD-27: Discrete foutmeldingen

#### [SSD-27.1.01] Display generic error messages to users

**Labels:** `SSD-27`

**Description:**

**As a** developer,
**I want** generic error messages displayed to users,
**So that** sensitive information is not leaked.

## Acceptance Criteria

- [ ] User-friendly error messages
- [ ] No stack traces to users
- [ ] No internal details exposed

## SSD Reference

- **Norm:** SSD-27
- **Category:** Foutmeldingen
- **Number:** 1.01
- **Original (NL):** De applicatie toont generieke foutmeldingen aan gebruikers.

## Current Implementation Status

- Error boundaries in Next.js
- Generic error pages
- Error details logged server-side

---

#### [SSD-27.1.02] Log detailed errors server-side

**Labels:** `SSD-27`

**Description:**

**As a** developer,
**I want** detailed errors logged server-side,
**So that** debugging is possible without exposing details.

## Acceptance Criteria

- [ ] Full error details in server logs
- [ ] Stack traces captured
- [ ] Correlation IDs for tracing

## SSD Reference

- **Norm:** SSD-27
- **Category:** Foutmeldingen
- **Number:** 1.02
- **Original (NL):** De applicatie logt gedetailleerde fouten aan de serverzijde.

## Current Implementation Status

- Logger service in `apps/web/src/lib/logger-server.ts`
- Error details captured with context
- Structured logging format

---

#### [SSD-27.1.03] Do not expose technical details in errors

**Labels:** `SSD-27`

**Description:**

**As a** developer,
**I want** technical details not exposed in errors,
**So that** attackers cannot gain information.

## Acceptance Criteria

- [ ] No database errors shown
- [ ] No file paths exposed
- [ ] No version information leaked

## SSD Reference

- **Norm:** SSD-27
- **Category:** Foutmeldingen
- **Number:** 1.03
- **Original (NL):** De applicatie toont geen technische details in foutmeldingen.

## Current Implementation Status

- Production error boundaries hide details
- API errors return safe messages
- neverthrow for type-safe errors

---

### Milestone: SSD-28: Discreet commentaar

#### [SSD-28.1.01] Remove development comments from production

**Labels:** `SSD-28`

**Description:**

**As a** developer,
**I want** development comments removed from production,
**So that** sensitive information is not exposed.

## Acceptance Criteria

- [ ] Comments stripped in build
- [ ] No TODO/FIXME in production
- [ ] Source maps configured appropriately

## SSD Reference

- **Norm:** SSD-28
- **Category:** Commentaar
- **Number:** 1.01
- **Original (NL):** De applicatie verwijdert ontwikkelcommentaar uit productie.

## Current Implementation Status

- Next.js minification in production
- Comments stripped during build
- Source maps not publicly accessible

---

#### [SSD-28.1.02] Do not include sensitive information in HTML comments

**Labels:** `SSD-28`

**Description:**

**As a** developer,
**I want** sensitive information not in HTML comments,
**So that** no secrets are exposed in page source.

## Acceptance Criteria

- [ ] No credentials in comments
- [ ] No internal URLs exposed
- [ ] No architecture details

## SSD Reference

- **Norm:** SSD-28
- **Category:** Commentaar
- **Number:** 1.02
- **Original (NL):** De applicatie bevat geen gevoelige informatie in HTML-commentaar.

## Current Implementation Status

- React/JSX doesn't output HTML comments
- Server components render clean HTML

---

### Milestone: SSD-29: Voorkom directory listing

#### [SSD-29.1.02] Disable directory listing on web server

**Labels:** `SSD-29`

**Description:**

**As a** developer,
**I want** directory listing disabled on web server,
**So that** file enumeration is prevented.

## Acceptance Criteria

- [ ] Directory listing disabled
- [ ] 404 for directory access
- [ ] Index files required

## SSD Reference

- **Norm:** SSD-29
- **Category:** Directory listing
- **Number:** 1.02
- **Original (NL):** De webserver heeft directory listing uitgeschakeld.

## Current Implementation Status

- Vercel doesn't expose directory listings
- Next.js routes handle all requests
- Static files served through Next.js

---

#### [SSD-29.1.03] Return 404 for non-existent resources

**Labels:** `SSD-29`

**Description:**

**As a** developer,
**I want** 404 returned for non-existent resources,
**So that** file existence is not revealed.

## Acceptance Criteria

- [ ] 404 for missing files
- [ ] No directory contents exposed
- [ ] Consistent error responses

## SSD Reference

- **Norm:** SSD-29
- **Category:** Directory listing
- **Number:** 1.03
- **Original (NL):** De applicatie retourneert 404 voor niet-bestaande resources.

## Current Implementation Status

- Next.js 404 handling
- Custom 404 page at `apps/web/src/app/not-found.tsx`

---

#### [SSD-29.1.04] Configure hosting per security guidelines

**Labels:** `SSD-29`

**Description:**

**As a** developer,
**I want** hosting configured per security guidelines,
**So that** directory listing is prevented.

## Acceptance Criteria

- [ ] Hosting configuration reviewed
- [ ] Security settings applied
- [ ] Regular audits performed

## SSD Reference

- **Norm:** SSD-29
- **Category:** Directory listing
- **Number:** 1.04
- **Original (NL):** De hostingpartij configureert de server conform beveiligingsrichtlijnen.

## Current Implementation Status

- Vercel managed hosting
- Security defaults applied
- Regular platform updates

---

### Milestone: SSD-31: Standaard stack

#### [SSD-31.1.01] Use standardized technology stack

**Labels:** `SSD-31`

**Description:**

**As a** developer,
**I want** standardized technology stack used,
**So that** security knowledge is consistent.

## Acceptance Criteria

- [ ] Approved technologies defined
- [ ] Stack documented
- [ ] Deviations approved

## SSD Reference

- **Norm:** SSD-31
- **Category:** Standaardisatie
- **Number:** 1.01
- **Original (NL):** De applicatie maakt gebruik van een gestandaardiseerde technologiestack.

## Current Implementation Status

- Next.js 16 / React 19 stack
- TypeScript throughout
- Documented in README

---

#### [SSD-31.1.02] Document technology stack

**Labels:** `SSD-31`

**Description:**

**As a** developer,
**I want** technology stack documented,
**So that** security can be assessed.

## Acceptance Criteria

- [ ] All technologies listed
- [ ] Versions documented
- [ ] Dependencies tracked

## SSD Reference

- **Norm:** SSD-31
- **Category:** Standaardisatie
- **Number:** 1.02
- **Original (NL):** De technologiestack is gedocumenteerd.

## Current Implementation Status

- package.json lists dependencies
- pnpm-lock.yaml for exact versions
- README documents stack

---

#### [SSD-31.1.03] Regular security updates for stack components

**Labels:** `SSD-31`

**Description:**

**As a** developer,
**I want** regular security updates for stack components,
**So that** vulnerabilities are patched.

## Acceptance Criteria

- [ ] Update process documented
- [ ] Security advisories monitored
- [ ] Patches applied timely

## SSD Reference

- **Norm:** SSD-31
- **Category:** Standaardisatie
- **Number:** 1.03
- **Original (NL):** De stack-componenten worden regelmatig bijgewerkt met beveiligingsupdates.

## Current Implementation Status

- Dependabot for automated updates
- pnpm audit for vulnerability scanning
- CI/CD includes security checks

---

#### [SSD-31.1.04] Evaluate new components for security

**Labels:** `SSD-31`

**Description:**

**As a** developer,
**I want** new components evaluated for security,
**So that** only secure dependencies are added.

## Acceptance Criteria

- [ ] Security review for new dependencies
- [ ] License compliance checked
- [ ] Maintenance status verified

## SSD Reference

- **Norm:** SSD-31
- **Category:** Standaardisatie
- **Number:** 1.04
- **Original (NL):** Nieuwe componenten worden geëvalueerd op beveiliging.

## Current Implementation Status

- npm registry for packages
- Verified publishers preferred
- License files reviewed

---

### Milestone: SSD-32: Bescherming tegen XXE

#### [SSD-32.1.01] Disable external entity processing in XML parsers

**Labels:** `SSD-32`

**Description:**

**As a** developer,
**I want** external entity processing disabled in XML parsers,
**So that** XXE attacks are prevented.

## Acceptance Criteria

- [ ] DTD processing disabled
- [ ] External entities blocked
- [ ] Secure parser configuration

## SSD Reference

- **Norm:** SSD-32
- **Category:** XXE preventie
- **Number:** 1.01
- **Original (NL):** De applicatie schakelt externe entiteitsverwerking uit in XML-parsers.

## Current Implementation Status

- JSON APIs preferred over XML
- No XML processing in application
- If needed, use secure parser config

---

#### [SSD-32.1.02] Use safe XML parsing libraries

**Labels:** `SSD-32`

**Description:**

**As a** developer,
**I want** safe XML parsing libraries used,
**So that** XXE vulnerabilities are avoided.

## Acceptance Criteria

- [ ] Libraries with XXE protection
- [ ] Default secure configuration
- [ ] Regular library updates

## SSD Reference

- **Norm:** SSD-32
- **Category:** XXE preventie
- **Number:** 1.02
- **Original (NL):** De applicatie maakt gebruik van veilige XML-parserbibliotheken.

## Current Implementation Status

- No XML parsing currently
- JSON for all data exchange
- Would use secure parser if needed

---

#### [SSD-32.2.01] Validate and sanitize XML input

**Labels:** `SSD-32`

**Description:**

**As a** developer,
**I want** XML input validated and sanitized,
**So that** malicious content is blocked.

## Acceptance Criteria

- [ ] XML schema validation
- [ ] Input sanitization
- [ ] Size limits enforced

## SSD Reference

- **Norm:** SSD-32
- **Category:** XXE preventie
- **Number:** 2.01
- **Original (NL):** De applicatie valideert en schoont XML-invoer.

## Current Implementation Status

- Not applicable (no XML)
- Would implement if XML needed

---

### Milestone: SSD-33: Veilige HTTP response headers

#### [SSD-33.1.01] Configure comprehensive security headers

**Labels:** `SSD-33`

**Description:**

**As a** developer,
**I want** comprehensive security headers configured,
**So that** browser security features are enabled.

## Acceptance Criteria

- [ ] All recommended headers set
- [ ] Headers verified in testing
- [ ] Regular header audits

## SSD Reference

- **Norm:** SSD-33
- **Category:** Response headers
- **Number:** 1.01
- **Original (NL):** De applicatie configureert uitgebreide beveiligingsheaders.

## Current Implementation Status

- CORS headers configured
- Additional headers needed:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy
  - Strict-Transport-Security
  - Referrer-Policy
  - Permissions-Policy

---

## Summary

| Milestone                                             | Stories |
| ----------------------------------------------------- | ------- |
| SSD-15: Scheiding Presentatie, Applicatie en Gegevens | 4       |
| SSD-17: Gescheiden beheerinterface                    | 5       |
| SSD-21: Beperkte commando/query-toegang               | 1       |
| SSD-22: Invoer-validatie                              | 5       |
| SSD-23: Beperkte file includes                        | 4       |
| SSD-24: Beperking HTTP-headers                        | 5       |
| SSD-26: Beperkte HTTP-methoden                        | 3       |
| SSD-27: Discrete foutmeldingen                        | 3       |
| SSD-28: Discreet commentaar                           | 2       |
| SSD-29: Voorkom directory listing                     | 3       |
| SSD-31: Standaard stack                               | 4       |
| SSD-32: Bescherming tegen XXE                         | 3       |
| SSD-33: Veilige HTTP response headers                 | 1       |
| **Total**                                             | **43**  |

---

## Quick Reference: Linear Project Details

- **Project ID:** `4ede9820-d495-45bf-a083-adc228cc9e20`
- **Team ID:** `344c571f-6a9b-4dcb-9b1d-3e69d7ec7b99`
- **Team Name:** Inovico
- **Project URL:** https://linear.app/inovico/project/inovy-security-and-privacy-compliance-e88ae07c5f86

