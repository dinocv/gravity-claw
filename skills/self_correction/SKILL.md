# Skill: Self-Correction & Intelligence Audit (Rule 9/14)

This skill enables Gravity Claw to audit its own performance, correct technical errors, and refine its user-knowledge model.

## Features (Self-Audit)
1. **Analyze Errors**: Reads the latest error logs (`LOGS.md` or console) and determines the root cause of failures.
2. **Auto-Fix**: If a fix is clear (e.g., updating a config, fixing a simple bug in a script), the agent generates a PR or modifies the file.
3. **Refine Persona**: Audits `MEMORY.md` to ensure the "Soul" (Morgan Freeman + Denzel vibe) is being maintained correctly.
4. **Context Cleanup**: Removes redundant or outdated facts from the database to keep the "Brain" fast.

## Goal (Rule 14)
- At the end of every successful task, call this skill to update `MEMORY.md`.
- Record project-specific paths and repetitive errors to avoid.
- Auto-fix all issues and errors to ensure the agent is "smarter than any other."

## Usage
- Decides which file or data to audit.
- Returns a summary of "Intelligence Updates" and "Fixed Errors."

## Best Practice
- Use this proactively when the user says "take control" or after completing a high-complexity task.
