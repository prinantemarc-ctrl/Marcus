"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentPlusIcon,
} from "@heroicons/react/24/outline";

type RequestStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";

interface SimulationRequest {
  id: string;
  title: string;
  description: string;
  targetAudience?: string;
  objectives?: string;
  status: RequestStatus;
  adminNotes?: string;
  simulationId?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<RequestStatus, { label: string; color: string; bgColor: string; icon: typeof ClockIcon }> = {
  PENDING: { label: "Pending Review", color: "text-yellow-400", bgColor: "bg-yellow-500/20", icon: ClockIcon },
  IN_REVIEW: { label: "Under Review", color: "text-blue-400", bgColor: "bg-blue-500/20", icon: ClockIcon },
  APPROVED: { label: "Approved", color: "text-green-400", bgColor: "bg-green-500/20", icon: CheckCircleIcon },
  REJECTED: { label: "Rejected", color: "text-red-400", bgColor: "bg-red-500/20", icon: XCircleIcon },
  IN_PROGRESS: { label: "In Progress", color: "text-purple-400", bgColor: "bg-purple-500/20", icon: ClockIcon },
  COMPLETED: { label: "Completed", color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: CheckCircleIcon },
};

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<SimulationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/client/requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Requests</h1>
          <p className="text-gray-400">Track the status of your simulation requests</p>
        </div>
        <Link
          href="/client/request"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white"
          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
        >
          <DocumentPlusIcon className="w-5 h-5" />
          New Request
        </Link>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <DocumentPlusIcon className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No requests yet</h3>
          <p className="text-gray-400 mb-6">Submit your first simulation request to get started</p>
          <Link
            href="/client/request"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white"
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
          >
            <DocumentPlusIcon className="w-5 h-5" />
            Create Request
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const status = statusConfig[request.status];
            const StatusIcon = status.icon;
            
            return (
              <div
                key={request.id}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{request.title}</h3>
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{request.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Submitted: {new Date(request.createdAt).toLocaleDateString()}</span>
                      {request.updatedAt !== request.createdAt && (
                        <span>• Updated: {new Date(request.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* View simulation link if completed */}
                  {request.status === "COMPLETED" && request.simulationId && (
                    <Link
                      href={`/client/simulations/${request.simulationId}`}
                      className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all text-sm font-medium"
                    >
                      View Results
                    </Link>
                  )}
                </div>

                {/* Admin notes if any */}
                {request.adminNotes && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Admin Notes:</p>
                    <p className="text-sm text-gray-300">{request.adminNotes}</p>
                  </div>
                )}

                {/* Progress indicator */}
                <div className="mt-4 flex items-center gap-2">
                  {(["PENDING", "IN_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED"] as RequestStatus[]).map((step, index) => {
                    const stepOrder = ["PENDING", "IN_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED"];
                    const currentOrder = stepOrder.indexOf(request.status);
                    const stepIdx = stepOrder.indexOf(step);
                    const isCompleted = stepIdx <= currentOrder && request.status !== "REJECTED";
                    const isActive = step === request.status;
                    
                    return (
                      <div key={step} className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${
                          isCompleted 
                            ? isActive 
                              ? statusConfig[request.status].bgColor.replace("/20", "")
                              : "bg-gray-400"
                            : "bg-gray-700"
                        }`} />
                        {index < 4 && (
                          <div className={`w-8 h-0.5 ${
                            stepIdx < currentOrder ? "bg-gray-400" : "bg-gray-700"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
