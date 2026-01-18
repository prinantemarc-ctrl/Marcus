"use client";

import { useState, useEffect } from "react";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { UsersIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Client {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  role: "ADMIN" | "CLIENT";
  createdAt: string;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // For now, display placeholder data
    // In production, this would fetch from the API
    setClients([
      {
        id: "1",
        name: "Demo Client",
        email: "demo@client.com",
        company: "Demo Corp",
        role: "CLIENT",
        createdAt: new Date().toISOString(),
      },
    ]);
    setLoading(false);
  }, []);

  const filteredClients = clients.filter(
    (client) =>
      client.name?.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase()) ||
      client.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clients</h1>
          <p className="text-gray-400 mt-1">Manage your client accounts</p>
        </div>
        <Button>
          <UsersIcon className="w-5 h-5 mr-2 inline" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </Card>

      {/* Clients Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No clients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
                          {client.name?.charAt(0).toUpperCase() || client.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{client.name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300">{client.email}</td>
                    <td className="py-4 px-4 text-gray-300">{client.company || "—"}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.role === "ADMIN"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {client.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-400 text-sm">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
