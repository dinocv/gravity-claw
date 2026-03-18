CopilotKit fully supports MCP Apps!

Bring MCP Apps interaction to your users with CopilotKit!

[See What's New](https://docs.copilotkit.ai/whats-new/mcp-apps-support)

[![Logo](https://docs.copilotkit.ai/images/logo-light.svg)![Logo](https://docs.copilotkit.ai/images/logo-dark.svg)](https://docs.copilotkit.ai/)

- [Documentation](https://docs.copilotkit.ai/)

- [API Reference](https://docs.copilotkit.ai/reference)

- [Learn](https://docs.copilotkit.ai/learn)

- [Copilot Cloud](https://cloud.copilotkit.ai/)


![Slanted end border](https://docs.copilotkit.ai/images/navbar/slanted-end-border-dark.svg)![Slanted end border](https://docs.copilotkit.ai/images/navbar/slanted-end-border-light.svg)

![Slanted start border](https://docs.copilotkit.ai/images/navbar/slanted-start-border-dark.svg)![Slanted start border](https://docs.copilotkit.ai/images/navbar/slanted-start-border-light.svg)

[Copilot Cloud](https://cloud.copilotkit.ai/ "Copilot Cloud") ![Theme icon](https://docs.copilotkit.ai/images/navbar/theme-moon.svg)![Theme icon](https://docs.copilotkit.ai/images/navbar/theme-sun.svg)Search...

Select integration...

- Getting Started

- [Overview](https://docs.copilotkit.ai/)
- [Quickstart](https://docs.copilotkit.ai/quickstart)
- [Coding Agents](https://docs.copilotkit.ai/coding-agents)
- Basics

- [Prebuilt Components](https://docs.copilotkit.ai/prebuilt-components)

Custom Look and Feel

- [Programmatic Control](https://docs.copilotkit.ai/programmatic-control)
- [Inspector](https://docs.copilotkit.ai/inspector)
- Generative UI


Your Components

- [Tool Rendering](https://docs.copilotkit.ai/generative-ui/tool-rendering)
- [State Rendering](https://docs.copilotkit.ai/generative-ui/state-rendering)
- [MCP Apps](https://docs.copilotkit.ai/generative-ui/mcp-apps)
- [A2UI](https://docs.copilotkit.ai/generative-ui/a2ui)
- App Control

- [Frontend Tools](https://docs.copilotkit.ai/frontend-tools)
- [Shared State](https://docs.copilotkit.ai/shared-state)
- Backend

- [Copilot Runtime](https://docs.copilotkit.ai/backend/copilot-runtime)
- [AG-UI](https://docs.copilotkit.ai/backend/ag-ui)
- Premium Features

- [CopilotKit Premium](https://docs.copilotkit.ai/premium/overview)
- [Observability](https://docs.copilotkit.ai/premium/observability)
- Troubleshooting

- [Migrate to V2](https://docs.copilotkit.ai/troubleshooting/migrate-to-v2)
- [Error Debugging](https://docs.copilotkit.ai/troubleshooting/error-debugging)
- [Error Observability Connectors](https://docs.copilotkit.ai/troubleshooting/observability-connectors)
- [Common Copilot Issues](https://docs.copilotkit.ai/troubleshooting/common-issues)
- [Migrate to 1.10.X](https://docs.copilotkit.ai/troubleshooting/migrate-to-1.10.X)
- [Migrate to 1.8.2](https://docs.copilotkit.ai/troubleshooting/migrate-to-1.8.2)
- Other


Contributing

Anonymous Telemetry

Reference

- Integrations

- [Built-in Agent](https://docs.copilotkit.ai/built-in-agent)
- [LangGraph](https://docs.copilotkit.ai/langgraph)
- [ADK](https://docs.copilotkit.ai/adk)
- [Microsoft Agent Framework](https://docs.copilotkit.ai/microsoft-agent-framework)
- [AWS Strands](https://docs.copilotkit.ai/aws-strands)
- [Mastra](https://docs.copilotkit.ai/mastra)
- [Pydantic AI](https://docs.copilotkit.ai/pydantic-ai)
- [CrewAI Flows](https://docs.copilotkit.ai/crewai-flows)
- [Agno](https://docs.copilotkit.ai/agno)
- [AG2](https://docs.copilotkit.ai/ag2)
- [Open Agent Spec](https://docs.copilotkit.ai/agent-spec)
- [LlamaIndex](https://docs.copilotkit.ai/llamaindex)
- [A2A](https://docs.copilotkit.ai/a2a)

## [Welcome to CopilotKit!](https://docs.copilotkit.ai/\#welcome-to-copilotkit)

CopilotKit is the **frontend stack for agents** and **generative UI**. Connect any agent framework or model to your React app for **chat**, **generative UI**, **canvas apps**, and **human-in-the-loop** workflows.

Look below to find right guide for your needs, whether you're starting from nothing or have existing agent you want to give a prebuilt chat UI or fully custom UI.

[Quickstart\\
\\
Get up and running in minutes.](https://docs.copilotkit.ai/quickstart) [API Reference\\
\\
Hooks, components, and config.](https://docs.copilotkit.ai/reference) [Chat UI\\
\\
Prebuilt chat with streaming.](https://docs.copilotkit.ai/prebuilt-components) [Generative UI\\
\\
Render tools as React components.](https://docs.copilotkit.ai/generative-ui/your-components/display-only)

app.tsx

Chat

Headless UI

Generative UI

Runtime

app.tsx

```
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-core/v2";
import "@copilotkit/react-ui/v2/styles.css";

export default function App() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <YourApp />
      <CopilotSidebar/>
    </CopilotKit>
  );
}
```

chat.tsx

```
import { useAgent } from "@copilotkit/react-core/v2";

export default function Chat() {
  const { run, messages, isRunning } = useAgent();

  return (
    <div>
      {messages.map((m) => (
        <p key={m.id}>{m.content}</p>
      ))}
      <button onClick={() => run("Hello!")}>
        {isRunning ? "Thinking..." : "Send"}
      </button>
    </div>
  );
}
```

weather-card.tsx

```
import { z } from "zod";
import { useComponent } from "@copilotkit/react-core/v2";

useComponent({
  name: "showWeather",
  description: "Display a weather card.",
  parameters: z.object({
    city: z.string(),
    temp: z.number(),
  }),
  render: ({ city, temp }) => (
    <div className="rounded border p-3">
      <div className="font-medium">{city}</div>
      <div className="text-2xl">{temp}°F</div>
    </div>
  ),
});
```

api/copilotkit/route.ts

```
import { NextRequest } from "next/server";
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "https://your-agent.example.com" }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

app.tsx

ChatHeadless UIGenerative UIRuntime

app.tsx

```
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-core/v2";
import "@copilotkit/react-ui/v2/styles.css";

export default function App() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <YourApp />
      <CopilotSidebar/>
    </CopilotKit>
  );
}
```

chat.tsx

```
import { useAgent } from "@copilotkit/react-core/v2";

export default function Chat() {
  const { run, messages, isRunning } = useAgent();

  return (
    <div>
      {messages.map((m) => (
        <p key={m.id}>{m.content}</p>
      ))}
      <button onClick={() => run("Hello!")}>
        {isRunning ? "Thinking..." : "Send"}
      </button>
    </div>
  );
}
```

weather-card.tsx

```
import { z } from "zod";
import { useComponent } from "@copilotkit/react-core/v2";

useComponent({
  name: "showWeather",
  description: "Display a weather card.",
  parameters: z.object({
    city: z.string(),
    temp: z.number(),
  }),
  render: ({ city, temp }) => (
    <div className="rounded border p-3">
      <div className="font-medium">{city}</div>
      <div className="text-2xl">{temp}°F</div>
    </div>
  ),
});
```

api/copilotkit/route.ts

```
import { NextRequest } from "next/server";
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "https://your-agent.example.com" }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

* * *

## [Explore by feature](https://docs.copilotkit.ai/\#explore-by-feature)

[Chat UI ›\\
\\
Prebuilt chat components with streaming, tool calls, and markdown.](https://docs.copilotkit.ai/prebuilt-components) [Headless UI ›\\
\\
Full rendering control via hooks — zero opinions on design.](https://docs.copilotkit.ai/headless) [Generative UI ›\\
\\
Render agent tools and state as interactive React components.](https://docs.copilotkit.ai/generative-ui/your-components/display-only) [Backend & Runtime ›\\
\\
Set up the CopilotKit runtime, AG-UI middleware, and endpoints.](https://docs.copilotkit.ai/backend) [Programmatic Control ›\\
\\
Build non-chat or fully custom experiences.](https://docs.copilotkit.ai/programmatic-control) [API Reference ›\\
\\
Complete reference for hooks, components, and configuration.](https://docs.copilotkit.ai/reference)

## [Explore by AI backend](https://docs.copilotkit.ai/\#explore-by-ai-backend)

[Built-in Agent ›\\
\\
Use CopilotKit's built-in agent — no external framework required.](https://docs.copilotkit.ai/built-in-agent/) [LangGraph ›\\
\\
LangChain's framework for stateful agent workflows.](https://docs.copilotkit.ai/langgraph/) [ADK ›\\
\\
Google's Agent Development Kit for building AI agents.](https://docs.copilotkit.ai/adk/) [Microsoft Agent Framework ›\\
\\
Microsoft's framework for building AI agents.](https://docs.copilotkit.ai/microsoft-agent-framework/) [AWS Strands ›\\
\\
AWS SDK for building and orchestrating AI agents.](https://docs.copilotkit.ai/aws-strands/) [Mastra ›\\
\\
TypeScript framework for building AI agents.](https://docs.copilotkit.ai/mastra/) [Pydantic AI ›\\
\\
Type-safe Python framework for AI agents.](https://docs.copilotkit.ai/pydantic-ai/) [CrewAI Flows ›\\
\\
Orchestrate sequential AI agent workflows.](https://docs.copilotkit.ai/crewai-flows/) [Agno ›\\
\\
Lightweight framework for building AI agents.](https://docs.copilotkit.ai/agno/) [AG2 ›\\
\\
The open-source multi-agent OS.](https://docs.copilotkit.ai/ag2/) [Open Agent Spec ›\\
\\
Open standard for defining AI agent interfaces.](https://docs.copilotkit.ai/agent-spec/) [LlamaIndex ›\\
\\
Framework for building LLM-powered data applications.](https://docs.copilotkit.ai/llamaindex/)

## [Feature comparison (by framework)](https://docs.copilotkit.ai/\#feature-comparison-by-framework)

| Feature | [Built-in](https://docs.copilotkit.ai/built-in-agent) | [LangGraph](https://docs.copilotkit.ai/langgraph) | [ADK](https://docs.copilotkit.ai/adk) | [Microsoft](https://docs.copilotkit.ai/microsoft-agent-framework) | [AWS Strands](https://docs.copilotkit.ai/aws-strands) | [Mastra](https://docs.copilotkit.ai/mastra) | [Agno](https://docs.copilotkit.ai/agno) | [Pydantic AI](https://docs.copilotkit.ai/pydantic-ai) | [CrewAI Flows](https://docs.copilotkit.ai/crewai-flows) | [LlamaIndex](https://docs.copilotkit.ai/llamaindex) | [AG2](https://docs.copilotkit.ai/ag2) | [Agent Spec](https://docs.copilotkit.ai/agent-spec) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Generative UI |  |  |  |  |  |  |  |  |  |  |  |  |
| Frontend Tools |  |  |  |  |  |  |  |  |  |  |  |  |
| Tool Rendering |  |  |  |  |  |  |  |  |  |  |  |  |
| MCP Apps |  |  |  |  |  |  |  |  |  |  |  |  |
| A2UI |  |  |  |  |  |  |  |  |  |  |  |  |
| Shared State |  |  |  |  |  |  |  |  |  |  |  |  |
| Readables |  |  |  |  |  |  |  |  |  |  |  |  |
| Interrupts |  |  |  |  |  |  |  |  |  |  |  |  |
| State Streaming |  |  |  |  |  |  |  |  |  |  |  |  |

![Slanted end border](https://docs.copilotkit.ai/images/redirects/slanted-end-border-dark.svg)![Slanted end border](https://docs.copilotkit.ai/images/redirects/slanted-end-border-light.svg)

![Slanted start border](https://docs.copilotkit.ai/images/redirects/slanted-start-border-dark.svg)![Slanted start border](https://docs.copilotkit.ai/images/redirects/slanted-start-border-light.svg)

[NEXT\\
Quickstart](https://docs.copilotkit.ai/quickstart)

![](https://static.scarf.sh/a.png?x-pxid=ffc9f65d-0186-4575-b065-61d62ea9d7d3)