import React, { useState } from 'react';
import { listMcpTools, callMcpTool } from '../../api/client';

export default function McpTest() {
  const [tools, setTools] = useState<any[] | null>(null);
  const [log, setLog] = useState<string>('');

  async function onList() {
    try {
      const apiKey = (import.meta.env.VITE_MCP_API_KEY as string) || undefined;
      const t = await listMcpTools(apiKey);
      setTools(t);
      setLog('tools listed');
    } catch (e: any) {
      setLog(String(e));
    }
  }

  async function onEcho() {
    try {
      const apiKey = (import.meta.env.VITE_MCP_API_KEY as string) || undefined;
      const res = await callMcpTool('echo', { text: 'Hello from frontend' }, apiKey);
      setLog(JSON.stringify(res));
    } catch (e: any) {
      setLog(String(e));
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <h3>MCP テスト</h3>
      <button onClick={onList}>ツール一覧取得</button>
      <button onClick={onEcho} style={{ marginLeft: 8 }}>echo 呼び出し</button>
      <div style={{ marginTop: 12 }}>
        <strong>ログ:</strong>
        <pre>{log}</pre>
      </div>
      {tools && (
        <div>
          <h4>ツール</h4>
          <ul>
            {tools.map((t, i) => (
              <li key={i}>{t.name} — {t.description}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
