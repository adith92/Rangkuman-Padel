```markdown
# Rangkuman-Padel Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and workflows used in the **Rangkuman-Padel** JavaScript codebase. It covers file naming conventions, import/export styles, commit message standards, and the process for contributing new visual styles, particularly for the v15 redesign. The repository does not use a framework and follows clear, conventional commit patterns and modular CSS organization.

## Coding Conventions

### File Naming
- Use **kebab-case** for all file names.
  - Example: `redesign-v15-1.css`, `main-component.js`

### Import Style
- Use **relative imports** for JavaScript modules.
  - Example:
    ```javascript
    import { myFunction } from './utils/helper.js';
    ```

### Export Style
- Use **named exports** for JavaScript modules.
  - Example:
    ```javascript
    // utils/helper.js
    export function myFunction() { /* ... */ }
    ```

### Commit Messages
- Use **conventional commit** format.
- Common prefixes: `style`, `feat`
- Example:
  ```
  style: add redesign v15 hero section
  feat: implement executive summary logic
  ```

## Workflows

### Add Redesign v15 Style Section
**Trigger:** When implementing or updating a visual section for the v15 redesign  
**Command:** `/add-redesign-v15-style-section`

1. **Create** a new CSS file named `redesign-v15-X.css`, where `X` is the section number.
2. **Implement** styles for the targeted section (e.g., core, hero, executive, venue, operations, responsive).
   - Example:
     ```css
     /* redesign-v15-2.css */
     .hero-section {
       background: linear-gradient(to right, #fff, #eee);
       padding: 2rem;
     }
     ```
3. **Commit** the new CSS file with a message following the pattern:  
   `style: add redesign v15 <section description>`
   - Example:
     ```
     style: add redesign v15 hero section
     ```
4. **Push** your changes and open a pull request if required.

**Files Involved:**
- `redesign-v15-1.css`
- `redesign-v15-2.css`
- `redesign-v15-3.css`
- `redesign-v15-4.css`

## Testing Patterns

- **Framework:** Unknown (no specific testing framework detected)
- **File Pattern:** Test files follow the `*.test.*` naming convention.
  - Example: `main-component.test.js`
- **Best Practice:** Place tests alongside the modules they test, using the `.test.js` suffix.

## Commands

| Command                           | Purpose                                                        |
|------------------------------------|----------------------------------------------------------------|
| /add-redesign-v15-style-section    | Scaffold and document a new CSS section for the v15 redesign   |
```
