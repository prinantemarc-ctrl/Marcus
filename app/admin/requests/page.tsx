"use client";

import { useState, useEffect } from "react";
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";

type RequestStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";

interface SimulationRequest {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetAudience?: string;
  objectives?: string;
  status: RequestStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    company?: string;
  };
}

const statusConfig: Record<RequestStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: "Pending", color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  IN_REVIEW: { label: "In Review", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  APPROVED: { label: "Approved", color: "text-green-400", bgColor: "bg-green-500/20" },
  REJECTED: { label: "Rejected", color: "text-red-400", bgColor: "bg-red-500/20" },
  IN_PROGRESS: { label: "In Progress", color: "text-purple-400", bgColor: "bg-purple-500/20" },
  COMPLETED: { label: "Completed", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<SimulationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SimulationRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "ALL">("ALL");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/admin/requests");
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

  const updateRequestStatus = async (requestId: string, status: RequestStatus, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes }),
      });

      if (response.ok) {
        fetchRequests();
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  };

  const filteredRequests = filterStatus === "ALL" 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "PENDING").length,
    inProgress: requests.filter(r => ["IN_REVIEW", "APPROVED", "IN_PROGRESS"].includes(r.status)).length,
    completed: requests.filter(r => r.status === "COMPLETED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Simulation Requests</h1>
        <p className="text-gray-400">Manage client simulation requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Requests</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-blue-400 text-sm">In Progress</p>
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-green-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["ALL", "PENDING", "IN_REVIEW", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === status
                ? "bg-white/20 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {status === "ALL" ? "All" : statusConfig[status].label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-12 text-center">
          <ClockIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{request.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[request.status].bgColor} ${statusConfig[request.status].color}`}>
                      {statusConfig[request.status].label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{request.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>From: {request.user?.name || request.user?.email || "Unknown"}</span>
                    {request.user?.company && <span>• {request.user.company}</span>}
                    <span>• {new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    title="View Details"
                  >
                    <EyeIcon className="w-5 h-5 text-gray-400" />
                  </button>
                  {request.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => updateRequestStatus(request.id, "IN_REVIEW")}
                        className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-all"
                        title="Start Review"
                      >
                        <PlayIcon className="w-5 h-5 text-blue-400" />
                      </button>
                    </>
                  )}
                  {request.status === "IN_REVIEW" && (
                    <>
                      <button
                        onClick={() => updateRequestStatus(request.id, "APPROVED")}
                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-all"
                        title="Approve"
                      >
                        <CheckCircleIcon className="w-5 h-5 text-green-400" />
                      </button>
                      <button
                        onClick={() => updateRequestStatus(request.id, "REJECTED")}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all"
                        title="Reject"
                      >
                        <XCircleIcon className="w-5 h-5 text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <XCircleIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[selectedRequest.status].bgColor} ${statusConfig[selectedRequest.status].color}`}>
                  {statusConfig[selectedRequest.status].label}
                </span>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Title</h3>
                <p className="text-white">{selectedRequest.title}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Description</h3>
                <p className="text-white whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>
              
              {selectedRequest.targetAudience && (
                <div>
                  <h3 className="text-sm text-gray-400 mb-1">Target Audience</h3>
                  <p className="text-white">{selectedRequest.targetAudience}</p>
                </div>
              )}
              
              {selectedRequest.objectives && (
                <div>
                  <h3 className="text-sm text-gray-400 mb-1">Objectives</h3>
                  <p className="text-white whitespace-pre-wrap">{selectedRequest.objectives}</p>
                </div>
              )}
              
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-sm text-gray-400 mb-1">Client</h3>
                <p className="text-white">{selectedRequest.user?.name || "N/A"}</p>
                <p className="text-gray-400 text-sm">{selectedRequest.user?.email}</p>
                {selectedRequest.user?.company && (
                  <p className="text-gray-400 text-sm">{selectedRequest.user.company}</p>
                )}
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Submitted</h3>
                <p className="text-white">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              {selectedRequest.status === "PENDING" && (
                <button
                  onClick={() => updateRequestStatus(selectedRequest.id, "IN_REVIEW")}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                >
                  Start Review
                </button>
              )}
              {selectedRequest.status === "IN_REVIEW" && (
                <>
                  <button
                    onClick={() => updateRequestStatus(selectedRequest.id, "REJECTED")}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => updateRequestStatus(selectedRequest.id, "APPROVED")}
                    className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
                  >
                    Approve
                  </button>
                </>
              )}
              {selectedRequest.status === "APPROVED" && (
                <button
                  onClick={() => updateRequestStatus(selectedRequest.id, "IN_PROGRESS")}
                  className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all"
                >
                  Start Simulation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
