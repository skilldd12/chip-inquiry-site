# BGA and procurement website upgrade implementation plan

> For agentic workers: use subagent-driven-development; shared filesystem with explicit file ownership. No Git repository is present, so source and SQLite backups are in the chat workspace work/bga-upgrade-original.

Goal: implement the approved website-upgrade-plan-bga.md, using NXP-style plastic BGA, realistic illustrative assets, richer trilingual content and existing RFQ infrastructure.

Architecture: keep Next App Router and database projections. Isolate the Three.js scene, add reusable server-rendered content pages with locale-aware content, store page overrides/media metadata in existing site configuration. Preserve inquiries and brand business records.

Tech stack: existing Next 16.4.2, React, GSAP, Three.js, SQLite, CSS. No new runtime dependency needed.

## Work ledger

- [x] Hero: replace gull-wing component and giant wafer with plastic BGA, solder ball array, restrained pointer and scroll movement; shorten intro; mobile and reduced-motion fallback. Files components/hero/* only. Verify canvas rendering, no exposed leads, no console errors, coherent poster.
- [x] Content routes: products and 6 category details; 8 brand details; 3 service details; industries and 4 details; resources and guides; quality. Shared trilingual content and story components, isolated styles. All CTAs carry brand/category/service/industry to the existing inquiry flow. Verify unknown slugs 404 and locale route generation.
- [x] Media: generate 18 individual photographic assets for warehouse(4), quality(2), company/service(2), category(6), industry(4); inspect and save locally. Images marked illustrative; no invented factual credentials.
- [x] Editorial integration: refresh homepage, services, warehouse, about, contact and FAQ presentation; remove public pending fields, retain real data in admin. Preserve existing RFQ body and attachment handling. Add primary grouped navigation, keyboard/mobile behavior, footer, breadcrumbs, sitemap.
- [x] Admin: media and rich-content configuration integrated into existing authenticated admin and config endpoint; preserve unknown config keys. Add translated alt/caption, source, image focus and relation fields. Validate API and avoid exposing secrets.
- [x] Review: inspect task deliverables for spec and code quality. Run typecheck, build and existing tests; test all locale pages and links, desktop/mobile overflow, keyboard menu, category/brand/service RFQ context, image success, fallback and 404.
- [x] Delivery: production build, restart only the verified local Next process on 4311; inspect actual production site, save review screenshots and handoff notes.

Image contract: /images/editorial/warehouse.webp, dry-storage.webp, receiving.webp, packing.webp, inspection.webp, traceability.webp, team.webp, bom.webp; category-processors.webp, category-memory.webp, category-power.webp, category-analog.webp, category-connectors.webp, category-passives.webp; industry-industrial.webp, industry-network.webp, industry-energy.webp, industry-automotive.webp.

Shared UI: cool grey #F5F6F7, graphite #191C1F, steel #48616F; no neon. Actual brand logos retained. No fake stock, staff identities, laboratories, certificates or client cases. zh/en equally complete, ru included. Desktop six grouped navigation menus, logo links home, explicit RFQ CTA.
