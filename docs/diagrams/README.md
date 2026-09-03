# PakVoice AI — FYP Diagrams

Paste-ready Mermaid diagrams for the final year project report.

## English — How to use

1. Open `index.html` in a browser (double-click, or drag into Chrome/Edge/Firefox).
2. Wait a second for Mermaid to render all figures.
3. Scroll to the diagram you need (or use the top nav links).
4. Capture for Word:
   - **Screenshot** the white figure card (Win + Shift + S), or
   - **Print → Save as PDF**, then crop/export pages.
5. Optional: edit any `.mmd` source, then paste the same text into the matching block in `index.html` (or regenerate PNGs with `mmdc`).

### Optional PNG export (if Node/npx works)

```bash
cd docs/diagrams
npx -y @mermaid-js/mermaid-cli -i 01-use-case.mmd -o png/01-use-case.png
```

Repeat for each `.mmd`, or use a small loop. Chromium is required by mermaid-cli.

## Roman Urdu — Kaise use karein

1. `index.html` ko browser mein kholo (double-click ya Chrome/Edge mein drag karo).
2. Thora wait karo — Mermaid saari diagrams render kar dega.
3. Jo figure chahiye us tak scroll karo (upar wali nav links bhi use kar sakte ho).
4. Word ke liye:
   - **Screenshot** lo (Win + Shift + S) white card ka, ya
   - **Print → Save as PDF** karke pages crop kar lo.
5. Agar diagram change karni ho to `.mmd` file edit karo, phir same code `index.html` ke us figure block mein update karo.

PNG export optional hai — agar `npx @mermaid-js/mermaid-cli` chal jaye to PNGs bana sakte ho; warna HTML + `.mmd` kaafi hain report ke liye.

## Files

| File | Title |
|------|-------|
| `01-use-case.mmd` | System Use Case Diagram |
| `02-dfd-level-0.mmd` | DFD Level 0 |
| `03-dfd-level-1.mmd` | DFD Level 1 |
| `04-dfd-level-2-generate-rag.mmd` | DFD Level 2 Generate+RAG |
| `05-system-architecture.mmd` | System Architecture |
| `06-class-diagram.mmd` | Class Diagram |
| `07-sequence-login.mmd` | Sequence — Login |
| `08-sequence-generate-rag.mmd` | Sequence — Generate+RAG |
| `09-sequence-upload.mmd` | Sequence — Upload Document |
| `10-collaboration-generate-rag.mmd` | Collaboration — Generate+RAG |
| `11-activity-generation.mmd` | Activity — Content Generation |
| `12-state-auth.mmd` | State — Auth Session |
| `13-erd.mmd` | Logical ERD |
| `14-deployment.mmd` | Deployment (Vercel + VPS + OpenAI) |
| `15-algorithm-flow.mmd` | High-level algorithm flow |
| `index.html` | Browser viewer (all diagrams) |
