---
name: add-redesign-v15-style-section
description: Workflow command scaffold for add-redesign-v15-style-section in Rangkuman-Padel.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-redesign-v15-style-section

Use this workflow when working on **add-redesign-v15-style-section** in `Rangkuman-Padel`.

## Goal

Adds a new CSS section for the v15 redesign, each targeting a specific part of the site (core, hero, executive, venue, operations, responsive).

## Common Files

- `redesign-v15-1.css`
- `redesign-v15-2.css`
- `redesign-v15-3.css`
- `redesign-v15-4.css`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create a new CSS file named 'redesign-v15-X.css' where X is a section number.
- Implement styles for the targeted section (e.g., core, hero, executive, venue, operations, responsive).
- Commit the new CSS file with a message following the pattern: 'style: add redesign v15 <section description>'.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.