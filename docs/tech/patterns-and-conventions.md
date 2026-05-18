# Patterns and Conventions

This is the code-recipe layer of the documentation. Where [tech-stack.md](tech-stack.md) names the tools and the reasons, and [feature-cheatsheet.md](../feature-cheatsheet.md) names what to consider per feature type, this doc names the shape code takes when you sit down to write it.

Patterns here are **normative until a canonical example lands in the codebase**. Once one does, the doc should point at the file as the authoritative example, and the sketch in the doc becomes secondary. The shape comes first; the example, when written, becomes the truth.

The doc is not a textbook. Each pattern names its purpose, its canonical shape, the rules that hold it together, and the boundary where it bends. If a pattern is producing the opposite of its intent, the boundary has been crossed — change the pattern or document the exception.

---

## Types for a component

**Purpose.** Make the meaning of a component's data visible from the type signature alone. A reader should be able to skim the types and know what the component does.

**Forces it serves.** Names are intent, not technical description ("action-oriented naming"). Source of truth is the schema; types are derived ("explicit over implicit"). Multi-meaning state is named at the type level rather than encoded in `null` or boolean combinations ("explicit over implicit", again).

**Canonical shape.**

Schemas live with their domain. Types are derived from schemas via `z.infer`, not declared independently.

```ts
// src/contact/contactSchema.ts
import { z } from 'zod';

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  tenancyType: z.string(),
  contactType: z.string(),
  lastCallSummary: z.string().nullable(),
  assignedPhonebanker: z.string().nullable(),
});

export type Contact = z.infer<typeof ContactSchema>;
```

Props types live with the component, named for what the component does.

```tsx
// src/contact/ContactCard/ContactCard.tsx
import type { Contact } from '@/contact/contactSchema';

export type Outcome =
  | 'had-conversation'
  | 'wants-removed'
  | 'no-answer'
  | 'skipped';

type ContactCardProps = {
  contact: Contact;
  onLogOutcome: (outcome: Outcome) => void;
  onSkip: () => void;
};

export function ContactCard({ contact, onLogOutcome, onSkip }: ContactCardProps) {
  // ...
}
```

State with multiple meaningful kinds is a discriminated union, not nested optionals.

```ts
type ClaimState =
  | { kind: 'loading' }
  | { kind: 'claimed'; contact: Contact }
  | { kind: 'exhausted' }
  | { kind: 'error'; error: ApiError };
```

**Rules.**

Schemas are the source of truth for any shape that crosses a boundary (API, storage, props going through a serialisation layer). Derive the type with `z.infer<typeof SchemaName>`; never declare the type and schema independently — they will drift.

Discriminated unions over `null` or boolean combinations when distinct meanings exist. `Contact | null` is appropriate when null means "no contact, full stop"; once a second meaning enters ("no contact because we're still loading", "no contact because the list is exhausted"), promote to a discriminated union. The kind tag is domain-flat (`'claimed'`, `'exhausted'`), not UI-flat (`'celebrate'`).

Action-oriented naming for props and types. `variant: 'primary'` not `colour: 'blue'`. `onLogOutcome` not `onClick`. The name should carry intent, so the reader doesn't have to chase the implementation to understand what it does.

Co-locate. The component's `Props` type is in the component file. Domain schemas live at the domain root (`src/contact/contactSchema.ts`). Cross-feature types live with the more authoritative domain, not in a `types/` bucket.

**Boundary.**

Don't reach for a discriminated union when there's truly one meaningful state. A boolean `isOpen` does not need to be `{ kind: 'open' } | { kind: 'closed' }`. The pattern earns its weight when distinct kinds carry distinct data or trigger distinct behaviours.

Don't derive a type from a schema you don't control. Third-party shapes get their own hand-written types or are wrapped in a schema we maintain.

---

## CSS for a component

**Purpose.** A component's styling is its own concern, lives with it, and reads as what the element *is* and what state it's *in* — nothing more.

**Forces it serves.** Co-location keeps domain knowledge together. Native CSS nesting and modern features mean no preprocessor cost. The class-for-variants / attribute-for-state split makes the cascade scannable as two distinct layers. Mobile-first matches the volunteer's primary device.

**Canonical shape.**

One file per component, co-located, one root selector. Imported as a side-effect from the component module.

```css
/* src/shared/Button/Button.css */
.button {
  /* base */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-2);
  font: inherit;
  font-weight: var(--weight-medium);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;

  /* variants — what the element IS */
  &.primary {
    color: var(--color-on-primary);
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  &.secondary {
    color: var(--color-text);
    background: transparent;
  }

  /* interactive state */
  &:where(:hover, :focus-visible) {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  /* ARIA state — what state the element IS IN */
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* desktop adjustments — mobile-first */
  @media (min-width: 768px) {
    padding: var(--space-2) var(--space-4);
  }
}
```

The component imports the CSS as a side-effect and applies classes and attributes directly.

```tsx
// src/shared/Button/Button.tsx
import './Button.css';

type ButtonProps = {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
};

export function Button({
  variant = 'secondary',
  disabled,
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={`button ${variant}`}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}
```

**Rules.**

Classes describe what the element *is*. Attributes describe what state it *is in*. `class="primary"` says "this is the primary variant"; `aria-disabled="true"` says "this is currently in the disabled state". Don't mix them — `class="disabled"` is a state masquerading as identity.

Native CSS nesting throughout. One root selector, one file. The nesting depth carries the cascade — base, then variants, then state, then media — and a reader can scan top-down without holding selectors in their head.

Tokens via custom properties from `src/styles/typography.css` (type roles) and `src/styles/colors.css` (colour primitives + semantic roles). Inline colours, spacing, or sizes are a smell — if a value isn't in the token set, either it belongs there or it doesn't belong in the design system.

Variants are full re-declarations, not partial overrides. The `&.primary` block sets every property that differs from base, even if some happen to match — this keeps the variant readable as a complete picture rather than a diff against base.

Mobile-first. Default styles are the mobile layout. `@media (min-width: ...)` adds adjustments for larger screens.

Don't reach outside the component. No descendant selectors that match elements rendered by other components (`.button .icon` is fine; `.contact-card .button` is not — the button doesn't know it's inside a contact card).

**Boundary.**

When a primitive in `src/shared/` is being used in a context with custom layout demands (e.g. a Row of Buttons with consistent widths), the layout adjustment belongs in the *consuming* component's CSS, not in the primitive. The primitive's CSS describes the primitive; the parent's CSS describes the arrangement.

When a style would only ever exist for one consumer of a shared primitive, the right move may be a new variant on the primitive, not a custom override. Earn the variant by name.

---

## Fetch and return type structures

**Purpose.** Data crossing process or HTTP boundaries is validated at the boundary, returned in shapes that name their meaning, and fails in ways the caller can act on.

**Forces it serves.** Side effects are explicit at the call site. The schema is visible where the data enters the program. Legitimate outcomes are typed; only world-broken cases throw. The same shape on both sides of the wire makes the codebase readable as one piece rather than two.

**Canonical shape — server transport.**

`airtableFetch<T>(path, schema, init?)` takes the Zod schema as a required argument and parses at the boundary. Generic in the parsed type. Lives in `server/airtable/client.ts`.

```ts
// server/airtable/client.ts
import { z } from 'zod';
import { AirtableUnavailableError } from './errors';

export async function airtableFetch<T>(
  path: string,
  schema: z.ZodSchema<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}/${baseId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new AirtableUnavailableError(`${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  return schema.parse(json);
}
```

**Canonical shape — coordinator return types.**

Legitimate outcomes are typed as discriminated unions. World-broken failures are named error classes.

```ts
// server/session/coordinator.ts
export type ClaimResult =
  | { kind: 'claimed'; contact: Contact }
  | { kind: 'list-exhausted' };

export function createAssignmentCoordinator(deps: { /* ... */ }) {
  async function claimNextUnassignedContact(
    sessionId: string,
    participantId: string,
  ): Promise<ClaimResult> {
    return mutex.runExclusive(async () => {
      // ...
      if (everyContactLogged) {
        return { kind: 'list-exhausted' };
      }
      return { kind: 'claimed', contact: nextContact };
    });
  }

  return { joinSession, claimNextUnassignedContact, releaseContact, recordOutcome };
}
```

```ts
// server/session/errors.ts
export class SessionNotFoundError extends Error {}
export class ParticipantNotRegisteredError extends Error {}
export class AirtableUnavailableError extends Error {}
```

Route handlers pattern-match on `instanceof` to translate to HTTP status. The discriminated union is returned in the response body; errors become HTTP errors.

**Canonical shape — client API calls.**

The client mirror of `airtableFetch`. Lives in `src/shared/api/apiFetch.ts` so every feature uses the same shape.

```ts
// src/shared/api/apiFetch.ts
import { z } from 'zod';
import { ApiError } from './ApiError';

export async function apiFetch<T>(
  path: string,
  schema: z.ZodSchema<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, init);

  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }

  const json = await res.json();
  return schema.parse(json);
}
```

```ts
// src/shared/api/ApiError.ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    const text = await res.text().catch(() => res.statusText);
    return new ApiError(res.status, text);
  }
}
```

Call sites use the same discriminated unions returned by the server.

```ts
// src/contact/ContactCard/useNextContact.ts
import { ClaimResultSchema } from '@/contact/contactSchema';

const result = await apiFetch(
  `/sessions/${sessionId}/next`,
  ClaimResultSchema,
);

switch (result.kind) {
  case 'claimed':
    return { kind: 'claimed', contact: result.contact };
  case 'list-exhausted':
    return { kind: 'exhausted' };
}
```

**Rules.**

The schema is a required argument at every transport boundary. Never `fetch(...).then(r => r.json())` without a schema — that defers parsing to "wherever someone uses this field", which is everywhere, which is nowhere.

Legitimate outcomes are in the return type. If the server can correctly answer "the list is exhausted", that's a `ClaimResult` kind, not a thrown exception. The discriminated union forces the caller to handle every case via `switch`.

World-broken conditions throw. The caller doesn't pattern-match on these — the framework (route handler, React error boundary) catches them and renders the appropriate response.

Error classes are named for what's wrong, not for the HTTP code. `SessionNotFoundError` is the meaning; mapping to 404 is the route handler's job. Multiple classes earn their weight as soon as two callers want to distinguish two failure modes.

Mirror the server's shape on the client. The same discriminated unions appear on both sides; the same schemas validate both directions. A new contributor reading the client should be able to predict the server's behaviour, and vice versa.

**Boundary.**

When a server response is a one-meaning shape (a single `Contact`, a single `Session`), there's no discriminated union to declare. The schema is enough.

When a fetch is genuinely fire-and-forget (logging, telemetry), the schema-at-boundary rule relaxes — the caller doesn't care about the response. These cases should be rare and named.

Client-side fetches that need React-level state machinery (loading, error, retry, optimistic update) wrap `apiFetch` in a feature-specific hook. The wrapping hook owns the state machine; `apiFetch` owns the wire.

---

## Adding a new pattern

The bar for adding to this doc: the pattern is decided (came out of the principled phases or a design review), it appears in or is about to appear in the codebase, and a contributor would otherwise have to reverse-engineer it from existing code.

The format above is the template — purpose, forces, canonical shape, rules, boundary. Keep each section short enough that a reader can hold the whole pattern in their head. If a pattern needs more than that, it's probably two patterns.
