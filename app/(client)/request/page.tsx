"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  DocumentTextIcon,
  UserGroupIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function SimulationRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAudience: "",
    objectives: "",
    additionalNotes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/client/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit request");
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Request Submitted Successfully!
          </h2>
          <p className="text-gray-400 mb-8">
            Our team will review your request and get back to you shortly.
            You can track the status of your request in the "My Requests" section.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push("/client/requests")}
              className="px-6 py-3 rounded-xl font-medium text-white"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
            >
              View My Requests
            </button>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  title: "",
                  description: "",
                  targetAudience: "",
                  objectives: "",
                  additionalNotes: "",
                });
              }}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-medium text-white hover:bg-white/20 transition-all"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Request New Simulation
        </h1>
        <p className="text-gray-400">
          Fill out the form below to request a new opinion simulation study.
          Our team will review and process your request.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <DocumentTextIcon className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Simulation Title</h3>
              <p className="text-sm text-gray-400">Give your simulation a clear, descriptive name</p>
            </div>
          </div>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="e.g., Consumer reaction to new product launch"
            required
          />
        </div>

        {/* Description */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary-500/20 flex items-center justify-center flex-shrink-0">
              <LightBulbIcon className="w-5 h-5 text-secondary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Description & Context</h3>
              <p className="text-sm text-gray-400">Explain what you want to test and provide relevant background</p>
            </div>
          </div>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[120px]"
            placeholder="Describe the scenario you want to simulate, including any relevant context or background information..."
            required
          />
        </div>

        {/* Target Audience */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <UserGroupIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Target Audience</h3>
              <p className="text-sm text-gray-400">Define the demographic or group you want to simulate</p>
            </div>
          </div>
          <input
            type="text"
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="e.g., French consumers aged 25-45, tech-savvy millennials, healthcare professionals"
          />
        </div>

        {/* Objectives */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Objectives</h3>
              <p className="text-sm text-gray-400">What insights or outcomes are you looking for?</p>
            </div>
          </div>
          <textarea
            name="objectives"
            value={formData.objectives}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[100px]"
            placeholder="e.g., Understanding public sentiment, identifying key concerns, measuring acceptance levels..."
          />
        </div>

        {/* Additional Notes */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Additional Notes</h3>
          <p className="text-sm text-gray-400 mb-4">Any other information that might be helpful (optional)</p>
          <textarea
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[80px]"
            placeholder="Timeline requirements, specific questions to test, attachments needed..."
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-medium text-white hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit Request"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
