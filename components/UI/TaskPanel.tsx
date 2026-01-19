"use client";

import { useState, useEffect } from "react";
import {
  taskManager,
  type Task,
  getTaskTypeLabel,
  getTaskTypeColor,
} from "@/lib/core/taskManager";
import {
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

export default function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsubscribe = taskManager.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
      // Auto-expand when new task is added
      if (updatedTasks.some((t) => t.status === "running")) {
        setIsMinimized(false);
      }
    });
    return unsubscribe;
  }, []);

  const activeTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "running"
  );
  const completedTasks = tasks.filter(
    (t) => t.status === "completed" || t.status === "failed"
  );

  // Don't show if no tasks
  if (tasks.length === 0) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-medium">
            {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} running
          </span>
          <ChevronUpIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[70vh] flex flex-col bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          {activeTasks.length > 0 && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
          <h3 className="text-sm font-semibold text-white">
            Background Tasks
          </h3>
          <span className="text-xs text-gray-400">
            ({activeTasks.length} active)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/10 rounded transition-all"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/10 rounded transition-all"
          >
            <XMarkIcon className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Task List */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* Active Tasks */}
          {activeTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${getTaskTypeColor(
                      task.type
                    )} animate-pulse`}
                  />
                  <span className="text-xs font-medium text-gray-400">
                    {getTaskTypeLabel(task.type)}
                  </span>
                </div>
                <span className="text-xs text-primary-400">
                  {task.progress}%
                </span>
              </div>
              <p className="text-sm text-white font-medium mb-1 truncate">
                {task.title}
              </p>
              {task.currentStep && (
                <p className="text-xs text-gray-400 mb-2 truncate">
                  {task.currentStep}
                </p>
              )}
              {/* Progress bar */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          ))}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <>
              {activeTasks.length > 0 && completedTasks.length > 0 && (
                <div className="border-t border-white/10 my-2" />
              )}
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border ${
                    task.status === "completed"
                      ? "bg-green-500/10 border-green-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {task.status === "completed" ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-sm text-white font-medium truncate">
                        {task.title}
                      </span>
                    </div>
                    <button
                      onClick={() => taskManager.removeTask(task.id)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <XMarkIcon className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  {task.error && (
                    <p className="text-xs text-red-400 mt-1 truncate">
                      {task.error}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Clear button */}
          {completedTasks.length > 0 && (
            <button
              onClick={() => taskManager.clearCompleted()}
              className="w-full py-2 text-xs text-gray-400 hover:text-white transition-all"
            >
              Clear completed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
