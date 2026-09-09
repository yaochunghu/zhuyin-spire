# Browser support and session behavior

## Build and verification contract

Keep the Vite + TypeScript DOM SPA. Production syntax targets are Chrome/Edge
120, Firefox 121, and Safari 17, declared in `vite.config.ts`. These are build
floors, not a claim that those historical releases have been device-tested.
Use current stable browsers. Playwright covers Chromium, Firefox, and WebKit;
WebKit automation does not certify physical iOS Safari or its speech service.

Use Node 22.23.1 (`.node-version`) and npm 11.19.1 (`packageManager`). CI pins
npm before installing the lockfile. npm 10's resolver failed during the audited
Vitest update; npm 11 resolved and verified the dependency graph successfully.

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run verify:dist
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:security:e2e
```

The second browser command tests the production artifact: privacy controls,
debug exclusion, full-cast tutorial to reward, checkpoint reload, unavailable
speech, storage denial, and overlapping hidden-page/menu pauses in all three
engines. Test artifacts use separate `test-results/responsive` and
`test-results/security` directories. Do not edit source while a Vite smoke run
is active: hot reload invalidates its gameplay state.

## Interrupted sessions

- Teaching timers compose named pause reasons. A menu, native modal, and hidden
  page must each release their own reason before timers resume.
- `visibilitychange` and `pagehide` cancel speech and attempt a stable checkpoint.
  `pageshow` rechecks visibility. Pending spells are not resolved by these events.
- Checkpoints still exclude combat and casting. Reload returns to the last
  stable room. Exact combat/cast recovery requires its own save-version design.
- Failed checkpoint writes show a warning on the pause button and in its menu.
  The next successful stable write clears the failure status. This cannot make
  unavailable storage durable, and forced browser termination may give no event.
- Native modal shells put menus, Options, deck inspection, and hand selection in
  the browser top layer. They block background input, handle Escape deliberately,
  and preserve pause ownership. The timed spelling reveal remains a live region
  so the global pause control stays reachable.
- A missing Mandarin voice, synthesis error, or speech-start timeout shows an
  adult read-aloud cue. The full first-syllable answer, including tones, remains
  required. Speech errors never count as a correct cast.

## Physical-device release gate (still required)

On a representative iPad/iPhone and Android phone: play the tutorial with casting
on; listen using a zh-TW voice; test audio interruption, background/resume, device
rotation, large text/pinch zoom, hand scrolling, and VoiceOver/TalkBack focus.
Record device, OS/browser version, and observed result. Desktop emulation cannot
supply this evidence. No new network speech service, recorded media, or service
worker is introduced. CSP remains unchanged.
