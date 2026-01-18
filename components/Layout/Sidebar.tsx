"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  HomeIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CpuChipIcon,
  PlayIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CubeTransparentIcon,
  UsersIcon,
  InboxIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  PlayIcon as PlayIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  CubeTransparentIcon as CubeTransparentIconSolid,
  UsersIcon as UsersIconSolid,
  InboxIcon as InboxIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
} from "@heroicons/react/24/solid";

// Admin navigation
const adminNavigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: "Zones", href: "/zones", icon: GlobeAltIcon, iconSolid: GlobeAltIconSolid },
  { name: "Clusters", href: "/clusters", icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
  { name: "3D Map", href: "/clusters/visualization", icon: CubeTransparentIcon, iconSolid: CubeTransparentIconSolid },
  { name: "Agents", href: "/agents", icon: CpuChipIcon, iconSolid: CpuChipIconSolid },
  { name: "Simulations", href: "/simulations", icon: PlayIcon, iconSolid: PlayIconSolid },
  { name: "Polls", href: "/polls", icon: ChartBarIcon, iconSolid: ChartBarIconSolid },
  { name: "divider", href: "", icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: "Clients", href: "/admin/clients", icon: UsersIcon, iconSolid: UsersIconSolid },
  { name: "Requests", href: "/admin/requests", icon: InboxIcon, iconSolid: InboxIconSolid },
  { name: "divider2", href: "", icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid },
  { name: "Test Pipeline", href: "/test-pipeline", icon: PlayIcon, iconSolid: PlayIconSolid },
];

// Client navigation
const clientNavigation = [
  { name: "Dashboard", href: "/client/dashboard", icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: "My Simulations", href: "/client/simulations", icon: PlayIcon, iconSolid: PlayIconSolid },
  { name: "My Polls", href: "/client/polls", icon: ChartBarIcon, iconSolid: ChartBarIconSolid },
  { name: "divider", href: "", icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: "Request Simulation", href: "/client/request", icon: DocumentTextIcon, iconSolid: DocumentTextIconSolid },
  { name: "My Requests", href: "/client/requests", icon: InboxIcon, iconSolid: InboxIconSolid },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export default function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  // Auto-detect admin based on session role if not explicitly set
  const isAdminUser = isAdmin ?? session?.user?.role === "ADMIN";
  const navigation = isAdminUser ? adminNavigation : clientNavigation;
  
  // Show loading state while session is loading
  const isLoading = status === "loading";

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 glass-strong z-40 border-r border-white/10">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold gradient-text">Marcus</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isAdmin ? "Admin Panel" : "Opinion Simulation"}
          </p>
        </div>

        {/* User info */}
        {session?.user && (
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.user.name || "User"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                session.user.role === "ADMIN" 
                  ? "bg-purple-500/20 text-purple-400" 
                  : "bg-blue-500/20 text-blue-400"
              }`}>
                {session.user.role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : navigation.map((item, index) => {
            if (item.name.startsWith("divider")) {
              return <div key={index} className="my-3 border-t border-white/10" />;
            }

            const isActive = pathname === item.href;
            const Icon = isActive ? item.iconSolid : item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                style={isActive ? { 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  boxShadow: "0 10px 15px -3px rgba(102, 126, 234, 0.2)"
                } : undefined}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? "text-white"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-gray-400 text-center">
            © 2024 Marcus by Aleria
          </p>
        </div>
      </div>
    </div>
  );
}
