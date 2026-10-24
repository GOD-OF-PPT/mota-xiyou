# Project instructions

- Prioritize PC browser gameplay and the reported bugs. Mobile adaptation and broad compatibility work are deferred.
- Inspect screenshots one at a time. Never send a large batch of images in one request; it can exceed the request size limit.
- Preserve the eighteen-floor campaign, deterministic combat, finite resources, both art styles, and direct `index.html` operation.
- Ordinary feedback, dialogue, battle forecasts, doors, and mechanism actions belong to the game scene. Do not use webpage-style modal dialogs for them.
- Validate progression with legal player actions. Teleporting or injecting resources is not proof that a route is playable.
- Do not claim visual fixes from source assertions alone: open representative PC screenshots at their actual size.
- Current interaction guidance is `docs/v10-immersion-plan.md`; implementation and evidence are tracked in `docs/v10-immersion-review.md` and `research/interaction-v10.json`.
- Do not retain a sidebar exception for inventory, character, altar, contracts, journal, or settings. Use the established scene ritual or full game pause experience, with consistent input and return behavior.
- Keep dialogue short and actionable, preserve a visible current objective, and require an explicit acknowledgement for floor arrivals. Ability presentation must consume settled engine events without repeating costs on skip.
