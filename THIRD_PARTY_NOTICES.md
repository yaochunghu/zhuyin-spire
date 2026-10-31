# Third-Party Notices

## Original art

The room plates, relic icons, map tokens, corner props, and act transitions in
`src/assets/art/` are original art generated with Grok Bot's built-in image
generation. They are not third-party assets and do not carry a separate
license.

Room plates (the three act scenes in use, plus the registered per-floor,
shop, camp, event, foyer, and Act IV plates under `src/assets/art/backdrops/`)
were produced with Grok Imagine from text-only prompts on 2026-10-29. Relic
icons, map tokens, corner props, and the two act transitions were produced
with the built-in GenerateImage tool, also from text-only prompts, on
2026-10-29. No text is drawn in the images.

Enemy sprites, the hero portrait, and the older plates these files replace
are separate from this notice.

## Original audio

`src/assets/audio/sfx/ding_A.mp3` (叮！ star-bead sound) and
`gold_A.mp3` (gold award) are fully procedural original work created for
zhuyin-spire: numpy synthesis of sine partials, encoded with ffmpeg/libmp3lame.
They use no samples, downloads, or third-party audio, and carry no separate
license. Both are placeholder sound design pending a final audio pass. The same
sounds can be synthesised at runtime from their recipes in `src/game/audio.ts`
(used as a fallback if a clip fails to load).

### Recorded voice lines (PLACEHOLDER)

The spoken lines in `src/assets/audio/voice/` are synthetic speech generated
for zhuyin-spire with ElevenLabs `eleven_v4` text-to-speech on Yao's paid
ElevenLabs Starter plan, whose terms include a commercial-use license. Both
voices are synthetic voices made with ElevenLabs Voice Design:

- 老師 (teacher voice), voice_id `A9pcHkZ8h5qkhGo5oBc4`
- 點燈人 (narrator, design E2a), voice_id `nEsUPAkAtglCHxVUeXMk`

No voice cloning was used, no real person is imitated, and no third-party
audio is included. Every clip is PLACEHOLDER audio for the first playtest and
may be replaced. Spire Audio's QA-passed batches, as shipped:

| folder | batch | clips | line ids |
|---|---|---|---|
| `voice/teacher/batch2/` | 老師 batch 2: 注音 and math prompts, feedback, praise, buttons | 168 | 168 (`u.notnow` is held and not included) |
| `voice/teacher/cards_rk/` | 老師 batch 2b: 留里克 card names and descs | 150 | 150 |
| `voice/teacher/cards_ry/` | 老師 batch 2b: 琉 card names and descs | 54 | 54 |
| `voice/teacher/events/` | 老師 batch 2b: event titles, texts, and choices | 124 | 152 (one 離開 clip serves 29 choices) |
| `voice/narrator/batch1/` | 點燈人 batch 1: live story lines | 54 | 54 |
| **total** | | **550** | **578** |

## Slay-the-Spire-style map-generation reference

The procedural map pipeline was informed by the open-source project
`silverua/slay-the-spire-map-in-unity`, which is licensed under the MIT License.

Copyright (c) 2020 Vladimir Limarchenko

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
