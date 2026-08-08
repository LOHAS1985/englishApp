const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3333;

app.use(bodyParser.json());

// Simple tools registry
const tools = [
  {
    name: 'echo',
    description: 'Echoes back the provided text',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
  },
  {
    name: 'read-file',
    description: 'Returns a mocked file content for demo',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  }
];

function makeJsonRpcError(id, code, message, data) {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

app.post('/', (req, res) => {
  const msg = req.body;
  if (!msg || msg.jsonrpc !== '2.0') {
    res.status(400).json(makeJsonRpcError(null, -32600, 'Invalid Request', null));
    return;
  }

  const { id, method, params } = msg;

  if (method === 'tools/list') {
    res.json({ jsonrpc: '2.0', id, result: tools });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const tool = tools.find(t => t.name === name);
    if (!tool) {
      res.json(makeJsonRpcError(id, -32601, 'Method not found', `tool '${name}' not found`));
      return;
    }

    // Basic validation
    if (tool.name === 'echo') {
      if (!args || typeof args.text !== 'string') {
        res.json(makeJsonRpcError(id, -32602, 'Invalid params', "'text' is required"));
        return;
      }
      res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: args.text }] } });
      return;
    }

    if (tool.name === 'read-file') {
      if (!args || typeof args.path !== 'string') {
        res.json(makeJsonRpcError(id, -32602, 'Invalid params', "'path' is required"));
        return;
      }
      // Mocked content for demo
      res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Mocked content of ${args.path}` }] } });
      return;
    }

    res.json(makeJsonRpcError(id, -32601, 'Method not implemented', name));
    return;
  }

  // notifications or unknown methods
  res.json(makeJsonRpcError(id, -32601, 'Method not found', method));
});

app.listen(PORT, () => console.log(`MCP mock server listening on http://localhost:${PORT}`));
