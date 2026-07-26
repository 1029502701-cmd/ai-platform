import React, { useState, useEffect } from "react";

interface Agent {
  id?: number;
  key: string;
  name: string;
  description?: string;
  status?: string;
  defaultModel?: string;
  maxSteps?: number;
}

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ key: "", name: "", description: "", defaultModel: "openai-gpt-4o-mini", maxSteps: 10 });

  useEffect(() => { loadAgents(); }, []);

  async function loadAgents() {
    try {
      const res = await fetch("/api/admin/agents");
      const data: any = await res.json();
      setAgents(data.agents || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/agents/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newAgent),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowCreate(false);
      setNewAgent({ key: "", name: "", description: "", defaultModel: "openai-gpt-4o-mini", maxSteps: 10 });
      loadAgents();
    } catch (err: any) { setError(err.message); }
  }

  async function toggleStatus(agent: Agent) {
    if (!agent.id) return;
    const newStatus = agent.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      loadAgents();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {showCreate ? "Cancel" : "+ New Agent"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow border border-gray-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Agent Key (e.g., assistant)" value={newAgent.key} onChange={e => setNewAgent({...newAgent, key: e.target.value})} required className="border rounded-lg px-3 py-2" />
            <input placeholder="Agent Name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} required className="border rounded-lg px-3 py-2" />
            <input placeholder="Description" value={newAgent.description} onChange={e => setNewAgent({...newAgent, description: e.target.value})} className="border rounded-lg px-3 py-2 col-span-2" />
            <select value={newAgent.defaultModel} onChange={e => setNewAgent({...newAgent, defaultModel: e.target.value})} className="border rounded-lg px-3 py-2">
              <option value="openai-gpt-4o-mini">GPT-4o Mini</option>
              <option value="openai-gpt-4o">GPT-4o</option>
              <option value="gemini-pro">Gemini Pro</option>
              <option value="claude-opus">Claude Opus</option>
              <option value="deepseek-chat">DeepSeek Chat</option>
            </select>
            <input type="number" placeholder="Max Steps" value={newAgent.maxSteps} onChange={e => setNewAgent({...newAgent, maxSteps: parseInt(e.target.value)})} className="border rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Create Agent</button>
        </form>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading agents...</div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steps</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map(a => (
                <tr key={a.key}>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">{a.key}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{a.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{a.defaultModel || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{a.maxSteps || 10}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${a.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {a.status || "active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => toggleStatus(a)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Toggle Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agents.length === 0 && <div className="p-8 text-center text-gray-400">No agents configured yet</div>}
        </div>
      )}
    </div>
  );
};
