---
name: test-frontend
description: Run the full Definition-of-Done checks for the SyndikPro frontend (typecheck, lint, format, build, browser smoke) and report pass/fail with concrete manual test steps Mouad can follow. Invoke before declaring any frontend feature done.
---

# test-frontend

Use this skill to verify a SyndikPro frontend change is actually ready. It is the operational expression of the **Definition of Done** in `frontend/CLAUDE.md`. Do not skip steps — every step is here because skipping it has bitten this project before (e.g., hardcoded FR strings that only showed up when Arabic was auto-detected).

## When to use

- After implementing any feature, page, or fix in `frontend/`.
- After a `shadcn add` to confirm the new component compiles + renders.
- Before opening a PR.
- When `frontend/CLAUDE.md` is updated with a new convention — re-run to confirm nothing regressed.

## Steps

### 1. Automated gates

Run, in order, from the repo root:

```bash
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run format:check --prefix frontend
npm run build --prefix frontend
```

Each must exit `0`. If `format:check` fails, run `npm run format --prefix frontend` then re-check. If anything else fails, **stop and fix it** before continuing — don't proceed to browser checks against broken code.

### 2. Start (or reuse) the dev preview

```
mcp__Claude_Preview__preview_start { name: "frontend" }
```

If the launch config is missing, expect `.claude/launch.json` to already define a server named `frontend` running `npm run dev --prefix frontend` on port 5173. Capture the returned `serverId` for the next steps.

### 3. Snapshot the relevant pages

For each page touched by the change:

```
mcp__Claude_Preview__preview_snapshot { serverId }
mcp__Claude_Preview__preview_screenshot { serverId }
```

Verify:
- Title / heading text matches expectations (and is **not** a missing-key fallback like `home.cards.foo.title`).
- All copy is rendered, not raw i18n keys.
- Layout is not broken (overlapping, off-screen, etc.).

### 4. Both languages if copy changed

If the change added or modified any UI strings:

```
mcp__Claude_Preview__preview_click { selector: 'button[aria-label*="langue"], button[aria-label*="اللغة"]' }
mcp__Claude_Preview__preview_screenshot
```

Both FR and AR must render with no raw keys, and AR must show `<html dir="rtl">`.

### 5. Console must be clean

```
mcp__Claude_Preview__preview_console_logs { level: "warn", lines: 50 }
```

Expect **no warnings or errors** introduced by the change. React-DevTools or React Query devtools messages are fine; runtime warnings about missing keys, hydration mismatches, prop-type errors, etc. are not.

### 6. Report

In the chat reply to Mouad, emit:

1. A one-line pass/fail summary per automated gate.
2. The screenshot(s) attached or referenced.
3. A numbered **Manual test plan** Mouad can run himself — URLs to open, clicks to make, expectations to verify. Do not write "it works"; write the steps.
4. Any deviations from `frontend/TESTING.md`.

### 7. Stop the preview (optional)

If you started a fresh server in step 2 and don't expect Mouad to keep testing immediately, stop it:

```
mcp__Claude_Preview__preview_stop { serverId }
```

Otherwise leave it running — Mouad may want to poke at the page.

## Failure modes & how to handle them

- **Preview MCP not available**: do steps 1 + 6, and in the report explicitly state "I could not run browser checks because the preview MCP isn't reachable; please run the manual test plan below." Do not silently skip.
- **Backend not running** when testing auth flow: that's expected for the OTP step — note it and still verify the network error toast renders, which proves the axios interceptor wiring.
- **Typecheck error from generated shadcn file**: re-run `npx shadcn@latest add <component> --overwrite` rather than hand-editing the generated file.
