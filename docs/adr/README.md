# Architecture decision records

Every decision that shapes the kit gets an ADR here before code is written. We use [MADR 4.0](https://adr.github.io/madr/); start from [template.md](template.md) and number files sequentially (`NNNN-short-title.md`).

An ADR is never edited to reverse its decision. Write a new one and mark the old one `superseded by ADR-NNNN`.

| ADR                             | Title                                                       | Status   |
| ------------------------------- | ----------------------------------------------------------- | -------- |
| [0001](0001-monorepo-layout.md) | Use a pnpm + Turborepo monorepo with one-way package layers | Accepted |

Planned by the build plan:

| ADR  | Topic                                               | Step |
| ---- | --------------------------------------------------- | ---- |
| 0002 | Primitive library: React Aria Components vs Base UI | 3    |
| 0003 | Token tier model and theme strategy                 | 1    |
