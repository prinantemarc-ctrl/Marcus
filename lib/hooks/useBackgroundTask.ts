"use client";

import { useCallback } from "react";
import { taskManager, type TaskType } from "@/lib/core/taskManager";

interface UseBackgroundTaskOptions {
  type: TaskType;
  title: string;
}

export function useBackgroundTask() {
  const startTask = useCallback(
    (
      options: UseBackgroundTaskOptions,
      taskFn: (
        updateProgress: (progress: number, step?: string) => void
      ) => Promise<unknown>
    ) => {
      const taskId = taskManager.addTask({
        type: options.type,
        title: options.title,
        status: "running",
        progress: 0,
      });

      const updateProgress = (progress: number, step?: string) => {
        taskManager.updateTask(taskId, {
          progress,
          currentStep: step,
        });
      };

      // Run task in background
      taskFn(updateProgress)
        .then((result) => {
          taskManager.completeTask(taskId, result);
        })
        .catch((error) => {
          taskManager.failTask(
            taskId,
            error instanceof Error ? error.message : "Task failed"
          );
        });

      return taskId;
    },
    []
  );

  return { startTask };
}
