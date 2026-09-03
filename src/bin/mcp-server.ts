#!/usr/bin/env node
import { runMcpServer } from '../mcp/server.js';

runMcpServer().catch((error) => {
  console.error('Fatal MCP Server error:', error);
  process.exit(1);
});
