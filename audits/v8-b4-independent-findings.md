# B4 independent result

PASS for the targeted fixed PC 2525×1208, DPR 1, material-style review. Chrome closed; no implementation edits, compatibility matrix or full browser campaign.

- Independently generated formal saves through the existing public-action trace prefix, stopping at first arrival on floor 10. Loaded floor 1, 4 and 10 checkpoints through `game.load()`.
- Observed the real foreground `drawImage` calls for one rendered interval. Every wall draw used a 16×16 destination matching a solid collision cell. None entered a landmark footprint. The actual depth queues were monotonic. The checks covered 269, 264 and 265 wall commands on floors 1, 4 and 10; snapshots stayed exactly unchanged.
- Opened the earlier first-floor wall crop and the independent current crop: the formerly thin boundaries now have visible vertical facades and side thickness. Opened independent full Buddha, pagoda and furnace landmark crops: those assets remain intact within their reserved footprints.
- Real mouse click at source pixel (233,289), alpha 250, of the floor-2 bat at (17,8): its wing is behind foreground wall (18,8), and the click selects that wall. No game-state change.
- Real mouse click at source pixel (127,225), alpha 252, of the floor-1 bat at (5,3): its head remains visibly in front of north wall (5,2), and the click selects the bat. No game-state change. Opened both independent screenshot crops to verify the visual outcome.
- The joint B3/B4 review preserves the bat/chest contact footprints in their walkable cells and keeps silhouette profile scale 1. No remaining blocker was observed in the requested grounding/foreground-wall cases.

Evidence: `audits/v8-b4-independent.json` (5 checks, completed true, no errors, stable renderer hash `8beac0cbde100e6ce5d2b2229be3da4bb31f07ac66e55bf64eba40ab42e638c2`), `audits/v8-b4-independent-{wall-thickness,buddha-landmark,pagoda-landmark,furnace-landmark,occlusion-hidden-region,occlusion-visible-region}.png`.

This is targeted acceptance of B4 and the listed B3/B4 overlap. B5/B6 remain separate pending work.
