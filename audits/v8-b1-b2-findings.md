# B1/B2 independent acceptance

Result: PASS for B1 and B2 at the single authorized PC viewport, 2525×1208, DPR 1, Chrome. The browser was closed in every run's finally block. No implementation files were edited. No compatibility matrix or full browser campaign ran.

## B1 reproduction and observed result

1. Start a new adventure, select 点灯僧 with a real map click, then walk one legal empty-floor step. The target card, connection line, direction indicator, inline content and selection all disappear.
2. Formally load an item checkpoint from the existing public-action trace. Select the item and walk away. Repeat by actually stepping onto the item, confirm it is collected, then leave. No stale target remains.
3. Formally load the legal reveal checkpoint, select the illusion and click the actual reveal button. Walk away after the event. The old event hint disappears.
4. From the initial checkpoint, select a safely reachable distant guard and click 接近. Cues remain hidden during the route and return at arrival. HP and removed entities remain unchanged; approach does not attack.

## B2 reproduction and observed result

1. Begin with the unread 入塔 introduction still present. Click 点灯僧 and 交谈. The current NPC's first page appears immediately inside the card next to the NPC. Next-page click and Space advance this conversation; the old introduction's text and page counter remain unchanged. Completing the pages closes the inline conversation.
2. Click 详察 to expand the full NPC text inside the same card. Click again to collapse. Open 交谈 and walk away; the inline content closes. Item details likewise expand inline. These inspection actions preserve the entire serialized game snapshot exactly.
3. Select a guard, click 规则, then collapse/reopen the actual inline formula. It stays within the target card and preserves the game snapshot. Real wheel scrolling exposes the final total.
4. Formally load the legal pre-boss checkpoint. Click the boss and 准备. The three choices appear inline, with no sheet/modal. Choosing a plan matches the public engine action exactly, including its legitimate turn increment, and spends no resources. Real wheel scrolling exposes all phase data and the expanded final formula.
5. Return to title and continue: unread story remains. Save manually, open an NPC conversation, then choose 读取手动存档: both old story and inline conversation clear. Repeat through JSON import: both clear and the imported snapshot matches exactly.

## Evidence

- Structured acceptance: `audits/v8-b1-b2-acceptance.json` (12 checks, completed true, no page errors, unchanged implementation hashes).
- Actual wheel-scroll verification: `audits/v8-b2-scroll-acceptance.json` (4 checks, completed true, no page errors).
- Opened and visually inspected: `v8-b1-leave-event.png`, `v8-b2-talk-full.png`, `v8-b2-talk-card.png`, `v8-b2-npc-details-card.png`, `v8-b2-npc-details-scrolled.png`, `v8-b2-formula-card.png`, `v8-b2-formula-scrolled.png`, `v8-b2-boss-prep-full.png`, `v8-b2-boss-formula-scrolled.png`, `v8-b2-import-cleared.png`.

The first harness attempts used a retired formula selector and assumed boss-plan selection had no turn increment. Those were harness assumptions, corrected without implementation changes. Prior successful checks were retained only after verifying unchanged source hashes; the unfinished tail was then rerun.

B3–B6 are outside this acceptance result and remain pending their separate implementation/validation signals.
