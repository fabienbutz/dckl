import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerActiveResource, registerStatusResource } from "./resources/index.js";
import { Runtime } from "./runtime.js";
import {
  registerActiveTaskTool,
  registerCheckToggleTool,
  registerClaimTool,
  registerCloseTool,
  registerCorrectionAddTool,
  registerCorrectionResolveTool,
  registerDoctorTool,
  registerNextUpTool,
  registerReleaseTool,
  registerSearchTool,
  registerSessionResumeTool,
  registerSprintCloseTool,
  registerSprintCreateTool,
  registerSprintViewTool,
  registerStatusTool,
  registerTaskCreateTool,
  registerTaskExportTool,
} from "./tools/index.js";

export function createServer(): McpServer {
  const runtime = new Runtime();
  const server = new McpServer({
    name: "dckl",
    version: "0.1.0",
  });

  // Resources
  registerActiveResource(server, runtime);
  registerStatusResource(server, runtime);

  // Read tools
  registerActiveTaskTool(server, runtime);
  registerNextUpTool(server, runtime);
  registerSearchTool(server, runtime);
  registerSessionResumeTool(server, runtime);
  registerSprintViewTool(server, runtime);
  registerStatusTool(server, runtime);
  registerTaskExportTool(server, runtime);

  // Write tools
  registerCheckToggleTool(server, runtime);
  registerClaimTool(server, runtime);
  registerCloseTool(server, runtime);
  registerCorrectionAddTool(server, runtime);
  registerCorrectionResolveTool(server, runtime);
  registerReleaseTool(server, runtime);
  registerSprintCloseTool(server, runtime);

  // PM tools
  registerDoctorTool(server, runtime);
  registerSprintCreateTool(server, runtime);
  registerTaskCreateTool(server, runtime);

  return server;
}
