# Akira Office — Asset Catalog V1

Fecha: 2026-10-05

## Decisión

La Oficina no debe depender de muebles dibujados manualmente cuando existen assets 3D gratuitos y reutilizables con licencia clara.

La estrategia V1 usa un **mirror público de transporte** para los GLB, pero conserva el origen/licencia de cada asset y fija el commit del mirror.

Mirror:

- Repository: `yadneshSalvi/hearth-webmcp`
- Commit: `617d6073a557cbc2f0f2ac917916e01b9c4b631b`
- CREDITS.md del mirror identifica los packs originales y sus licencias.

## Assets seleccionados

| Categoría | Archivo | Creador/origen | Licencia |
|---|---|---|---|
| Desk | `desk-kari.glb` | Quaternius Furniture Pack | CC0 |
| Chair | `chair-olve.glb` | Kenney Furniture Kit 2.0 | CC0 |
| Shelf | `shelf-kant.glb` | Quaternius Furniture Pack | CC0 |
| Lamp | `floor-lamp-arc.glb` | Kenney Furniture Kit 2.0 | CC0 |
| Plant | `plant-fern.glb` | Isa Lousberg / House Plants set | CC0 |
| Lounge | `armchair-kyst.glb` | KayKit Furniture Bits 1.0 | CC0 |
| Meeting table | `table-rove.glb` | Kenney Furniture Kit 2.0 | CC0 |
| Decoration | `decor-vase.glb` | CreativeTrio / Household Props 001 | CC0 |

## Fuentes oficiales

- Quaternius Furniture Pack: https://quaternius.com/packs/furniture.html
- Quaternius Ultimate House Interior Pack: https://quaternius.com/packs/ultimatehomeinterior.html
- Quaternius Stylized Nature MegaKit: https://quaternius.com/packs/stylizednaturemegakit.html
- Kenney Furniture Kit: https://kenney.nl/assets/furniture-kit
- KayKit Furniture Bits: https://kaylousberg.itch.io/furniture-bits

## Principios de integración

1. Licencia explícita antes de integrar.
2. Commit/version pinning cuando el transporte sea externo.
3. GLB/glTF preferido para Three.js.
4. Reutilización de geometría mediante clones.
5. Mantener fallback procedural si una descarga falla.
6. No bloquear la Oficina completa por un asset decorativo opcional.
7. Prioridad al rendimiento móvil.

## Scope

Este catálogo no cambia backend, Supabase, RLS, Identity Root ni el modelo de verdad de agentes.

