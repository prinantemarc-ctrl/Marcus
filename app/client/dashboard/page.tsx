"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  PlayIcon, 
  ChartBarIcon, 
  DocumentPlusIcon,
  ClockIcon 
} from "@heroicons/react/24/outline";

export default function ClientDashboard() {
  const { data: session } = useSession();

  // TODO: Fetch real data from API
  const stats = {
    totalSimulations: 0,
    totalPolls: 0,
    pendingRequests: 0,
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-2xl p-8 border border-white/10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {session?.user?.name || "there"}! 👋
        </h1>
        <p className="text-gray-400">
          Access your simulations, polls, and request new opinion studies.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <PlayIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Simulations</p>
              <p className="text-2xl font-bold text-white">{stats.totalSimulations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Polls</p>
              <p className="text-2xl font-bold text-white">{stats.totalPolls}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pending Requests</p>
              <p className="text-2xl font-bold text-white">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/client/request"
            className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                <DocumentPlusIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                  Request New Simulation
                </h3>
                <p className="text-gray-400 text-sm">
                  Submit a request for a new opinion study
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/client/simulations"
            className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                <PlayIcon className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
                  View Simulations
                </h3>
                <p className="text-gray-400 text-sm">
                  Access your completed simulations and results
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400">No recent activity</p>
          <p className="text-gray-500 text-sm mt-1">
            Your recent simulations and requests will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
