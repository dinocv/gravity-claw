# Skill: Agent Skills Ecosystem & MCP

This skill provides knowledge about the Agent Skills ecosystem and Model Context Protocol (MCP).

## Overview

**Agent Skills** are reusable capabilities for AI agents. They are folders of instructions, scripts, and resources that agents can discover and use to do things more accurately and efficiently.

**Model Context Protocol (MCP)** is an open protocol that enables seamless integration between LLM applications and external data sources and tools.

## Key Resources

### Agent Skills Directory
- **skills.sh** - The open agent skills directory/marketplace
  - Install skills with: `npx skills add <owner/repo>`
  - Supports: Antigravity, Claude Code, Kilo, OpenCode, Cline, Cursor, Windsurf, and many more

### Documentation
- **agentskills.io** - Official documentation for the Agent Skills format
  - Specification: `/specification`
  - Client implementation guide: `/client-implementation/adding-skills-support`
  - Example skills: `github.com/anthropics/skills`

### MCP (Model Context Protocol)
- **spec.modelcontextprotocol.io** - Official MCP specification
- **modelcontextprotocol.io** - MCP documentation and guides
- **github.com/modelcontextprotocol/modelcontextprotocol** - Schema and SDKs
  - TypeScript SDK and Python SDK available

## Why Agent Skills?

Agents are increasingly capable but often don't have the context they need to do real work reliably. Skills solve this by giving agents access to procedural knowledge and company-, team-, and user-specific context they can load on demand.

**For skill authors**: Build capabilities once and deploy them across multiple agent products.

**For teams and enterprises**: Capture organizational knowledge in portable, version-controlled packages.

## What Can Agent Skills Enable?

- **Domain expertise**: Package specialized knowledge (legal review, data analysis pipelines)
- **New capabilities**: Creating presentations, building MCP servers, analyzing datasets
- **Repeatable workflows**: Turn multi-step tasks into consistent, auditable workflows
- **Interoperability**: Reuse the same skill across different skills-compatible agents

## MCP Architecture

MCP uses a client-host-server architecture:

- **Hosts**: LLM applications that initiate connections
- **Clients**: Connectors within the host application
- **Servers**: Services that provide context and capabilities

### Core Features
- **Tools**: Functions for the AI model to execute
- **Prompts**: Templated messages and workflows
- **Resources**: Context and data for the user or AI model
- **Sampling**: Server-initiated LLM requests
- **Elicitation**: Server requests for additional user information

## Supported Agents

Agent Skills are supported by: Junie, Gemini CLI, OpenCode, OpenHands, Mux, Cursor, Amp, Letta, Firebender, Goose, GitHub, VS Code, Claude Code, OpenAI Codex, Roo Code, TRAE, and many more.

## Related Skills

- `anthropics/skills/frontend-design` - Production-grade frontend interfaces
- `anthropics/skills/mcp-builder` - Build MCP servers
- `vercel-labs/skills/find-skills` - Discover available skills
