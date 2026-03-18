# Skill: Architectural Planner (Manus Style)

This skill enforces the "Think Before Act" protocol by generating a structured **Task Manifesto**. 

## Rule
Before executing any complex user request, you MUST call this skill to plan your actions.

## The Task Manifesto
A valid manifesto must include:
- **Objective**: The final successful outcome in clear terms.
- **Milestones**: 3–5 logical sub-tasks to reach the goal.
- **Toolbox**: Specific tools (Browser, Shell, Python, Research) to be used.
- **Security Check**: Assessment of any potential risks or privacy concerns.

## Usage
Calling this skill will:
1. Log the plan to a dedicated `PLAN.md` file in the project root.
2. Output a formatted summary to the user for approval.

## Benefits
- Prevents "tool sprawl" (calling tools randomly).
- Provides a clear audit trail for the user.
- Enhances reliability by anticipating edge cases early.
