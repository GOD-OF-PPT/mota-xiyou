# B3 grounding independent result

PASS for grounding at fixed PC 2525×1208, DPR 1, material style. Chrome closed. No implementation files edited.

- Opened author before/after bat and chest crops, then opened the independently captured bat/chest and after-movement screenshots. Chest now rests on the walkable tile with visible bottom margin; bat retains its full wings and an independent ground shadow. Its damage label no longer covers its body/base.
- Actual mouse clicks hit opaque source pixels at top, left, right and outside the strict grid cell on both bat and chest. Every click selected the correct entity; the serialized game state stayed exactly unchanged.
- Ground footprints remain within their own walkable cells. Existing sprite scales remain 1.25 for bat and 1 for chest; no global shrink was used.
- A legal public-action trace prefix supplied a vertical-movement checkpoint away from camera clamping. The real ArrowUp action matched the expected public engine snapshot exactly. Observed active motion frames used matching sprite-foot and shadow contacts and the matching following-camera timestamp; stationary contact matched too.
- Eleven independent checks passed, no page errors, renderer source hash stable during the run.

Evidence: `audits/v8-b3-independent.json`, `audits/v8-b3-independent-{whole,bat,chest,bat-selected,chest-selected,stationary,after-vertical-move}.png`.

This accepts B3 grounding only. Wall thickness and front/back occlusion remain B4; the overall clipping/occlusion outcome must be confirmed jointly after B4.
