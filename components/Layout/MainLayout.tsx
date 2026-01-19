"use client";

import Sidebar from "./Sidebar";
import TaskPanel from "@/components/UI/TaskPanel";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen relative" style={{ position: 'relative', zIndex: 10 }}>
      <Sidebar />
      <main className="flex-1 ml-64 p-8 relative" style={{ position: 'relative', zIndex: 10, minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto relative" style={{ position: 'relative', zIndex: 10 }}>
          {children}
        </div>
      </main>
      {/* Background Task Panel */}
      <TaskPanel />
    </div>
  );
}
