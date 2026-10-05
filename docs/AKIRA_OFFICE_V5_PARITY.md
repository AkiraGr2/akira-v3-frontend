# Akira Office V5 — Munder-Difflin Parity Reimplementation

## Objective
Rebuild the Akira Project office using the *functional* layout/movement architecture observed in Munder Difflin while replacing all expressive art/branding with Akira-owned visuals.

## Non-negotiables
- 2D pixel office only. No 3D.
- 9-agent roster: 8 active + Dante disabled.
- Backend state is authoritative; no decorative random wandering for active work.
- Agents use purposeful routes between home desks and semantic stations.
- Collision/pathfinding must protect desks, walls and props.
- Asset filenames are explicit so the owner can upload replacements manually.

## Architecture to mirror
Munder uses two complementary data planes:
1. structured agent lifecycle/tool events drive avatar state and station selection;
2. a terminal stream drives a selected-agent console.

For the Akira web frontend, the office can mirror the first plane immediately through the existing Render APIs. The console should be implemented as an Akira UI over the remote backend's available task/tool/log stream. A byte-for-byte PTY console like Munder's requires a server-side PTY/WebSocket bridge; GitHub Pages alone cannot spawn a real local process.

## Asset contract
Primary floor:
- `assets/office/01_akira_office_floor_v5.png`
- 1536x1024
- clean background, no UI chrome
- redesigned Akira palette and furniture
- functional corridors/desk zoning intentionally separated from the reference artwork

Optional prop atlas:
- `assets/office/02_akira_office_props_atlas_v1.png`
- 512x256
- coffee, printer, terminal, mission board, memory, MCP, meeting, mailbox

Existing agent atlas remains:
- `assets/office/02_office_agents_atlas_v3_clean4.png`

## Reference/code licensing boundary
Munder Difflin's source code is MIT-licensed, so code may be reused/modified subject to retaining the MIT copyright/license notice for copied substantial portions. Its bundled pixel-art tiles/maps are separately licensed and must not be copied into Akira. Akira V5 therefore reimplements the architecture and creates replacement Akira artwork.

## Next implementation step
Wait for the owner to upload the V5 floor image (and, when desired, prop atlas). Then:
- switch runtime scene path;
- align seat/station anchors to the final art;
- preserve/refine the 4-direction grid pathfinding;
- add the selected-agent Akira console surface;
- run syntax + browser + pixel-office E2E before merge.
