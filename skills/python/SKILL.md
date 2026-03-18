# Skill: Python Code Execution (Production Document Generator)

This skill allows the agent to execute Python code to generate professional-grade documents, perform complex data analysis, or automate technical tasks.

## Features
- Full access to Python standard library and pre-installed packages (pandas, matplotlib, openpyxl, etc.).
- Generate professional PDF/Excel/PPT outputs.
- Data visualization (plots/charts) as images.
- Scripting for complex logic that is cumbersome in JS.

## Goal (Rule 11)
Use this skill for:
1. "Create an Excel file summarizing [Topic]."
2. "Generate a monthly report PDF."
3. "Plot these statistics as a chart."

## Usage
- Provide a clear, complete Python script in the `code` payload.
- All output files must be saved to the `outputs/` folder (created automatically).
- The skill returns the `stdout` and a list of generated file paths.

## Security
- Scripts run in the local environment - be careful with OS commands.
- Ensure all logic is self-contained or uses provided context data.
