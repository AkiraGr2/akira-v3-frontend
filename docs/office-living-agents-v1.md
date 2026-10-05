# AKIRA OFFICE — LIVING AGENTS V1

## Decision gate
Approved visual direction: cinematic cognitive workspace with a central Akira core, physical humanoid agents, warm/cool lighting, holographic work surfaces, and a living environment.

## Implementation strategy
- Three.js/WebGL for the scene.
- GLTF/GLB humanoid models with skeletal animation.
- Read-only backend synchronization from /api/v8/agents and /api/v8/tasks.
- No new backend contract and no database writes.
- Agent state remains authoritative; animation is presentation.
- Real task collaboration is shown only when multiple active tasks share an explicit mission/task grouping field.
- Idle movement is environmental/personal-life animation, not fabricated work.
- Pause control stops visual progression and polling.
- Reduced-motion preference gets a calmer scene.
- Mobile-first quality/performance profile.

## Free/licensing strategy
Use CC0/Public Domain Quaternius character assets served by Poly Pizza's static CDN. The selected assets are free for personal and commercial use and do not require attribution, but this project records provenance anyway.

Selected sources:
- Business Man — https://poly.pizza/m/JFrLIKqvCH
- Animated Woman — https://poly.pizza/m/qJ2gsTUBHL
- Hoodie Character — https://poly.pizza/m/gKLBoRsyKe
- Worker — https://poly.pizza/m/Yg2bQZO6Hj

Known direct CDN resources:
- Business Man: https://static.poly.pizza/e599abbe-7d73-488c-9d7e-3ead281e705c.glb
- Animated Woman: https://static.poly.pizza/ba7a1955-ea51-4cb9-a561-188bdef0a6c7.glb
- Hoodie Character: https://static.poly.pizza/bcd66ec5-5e81-4901-a222-47abc875fe2a.glb
- Worker: https://static.poly.pizza/3a5f3056-ffe6-42eb-bd52-122afcbd22b2.glb

## Safety / truthfulness
- The scene must not claim that an agent is doing work when its authoritative state is not active.
- Visual choreography may enrich idle life, but labels and work states come from real agent/task data.
- External asset load failure must degrade visibly and safely; no fabricated agents or hidden failure.
- This branch must be tested before any merge/deploy.

## Acceptance criteria for V1
1. Real humanoid GLB characters render in the Office.
2. Characters have idle/walk and, when available, work/talk animation clips.
3. Active tasks drive working state and movement to a work station.
4. Shared explicit task/mission grouping can trigger a briefing location.
5. Idle agents have restrained local movement.
6. Environment has continuous ambient motion.
7. Tap/click selects an agent and updates the existing detail panel.
8. Existing agent/task metrics remain functional.
9. No database writes are introduced.
10. Main branch is untouched until tests and review pass.
