"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { getAllPolls, deletePoll } from "@/lib/core/poll";
import type { PollResult } from "@/types";
import Link from "next/link";
import { PlusIcon, TrashIcon, ChartBarIcon } from "@heroicons/react/24/outline";

export default function PollsPage() {
  const [polls, setPolls] = useState<PollResult[]>([]);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = () => {
    setPolls(getAllPolls());
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this poll?")) {
      deletePoll(id);
      loadPolls();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Polls</h1>
            <p className="text-gray-400 mt-1">
              Test names and options with your agents
            </p>
          </div>
          <Link href="/polls/new">
            <Button>
              <PlusIcon className="w-5 h-5 mr-2 inline" />
              New Poll
            </Button>
          </Link>
        </div>

        {/* Polls Grid */}
        {polls.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No polls created</p>
              <Link href="/polls/new">
                <Button>Create your first poll</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {polls.map((poll) => (
              <Card key={poll.id} hover>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {poll.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2">{poll.question}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-300">
                        {poll.responseMode}
                      </span>
                      <span className="text-xs text-gray-500">
                        {poll.options.length} options
                      </span>
                      <span className="text-xs text-gray-500">
                        {poll.responses.length} responses
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xs text-gray-500">
                      {new Date(poll.createdAt).toLocaleDateString("en-US")}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/polls/${poll.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChartBarIcon className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(poll.id)}
                      >
                        <TrashIcon className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
