/**
 * Task Manager - Background task management system
 */

export type TaskType = "zone" | "cluster" | "agent" | "simulation" | "poll";
export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  progress: number; // 0-100
  currentStep?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  result?: unknown;
}

type TaskListener = (tasks: Task[]) => void;

class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private listeners: Set<TaskListener> = new Set();

  // Generate unique task ID
  createTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add a new task
  addTask(task: Omit<Task, "id" | "createdAt">): string {
    const id = this.createTaskId();
    const newTask: Task = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(id, newTask);
    this.notifyListeners();
    return id;
  }

  // Update task progress
  updateTask(id: string, updates: Partial<Task>): void {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.set(id, { ...task, ...updates });
      this.notifyListeners();
    }
  }

  // Complete a task
  completeTask(id: string, result?: unknown): void {
    this.updateTask(id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      result,
    });
    
    // Auto-remove completed tasks after 10 seconds
    setTimeout(() => {
      this.removeTask(id);
    }, 10000);
  }

  // Fail a task
  failTask(id: string, error: string): void {
    this.updateTask(id, {
      status: "failed",
      error,
      completedAt: new Date().toISOString(),
    });
  }

  // Remove a task
  removeTask(id: string): void {
    this.tasks.delete(id);
    this.notifyListeners();
  }

  // Get all tasks
  getTasks(): Task[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Get active tasks (pending or running)
  getActiveTasks(): Task[] {
    return this.getTasks().filter(
      (t) => t.status === "pending" || t.status === "running"
    );
  }

  // Subscribe to task updates
  subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getTasks());
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    const tasks = this.getTasks();
    this.listeners.forEach((listener) => listener(tasks));
  }

  // Clear all completed/failed tasks
  clearCompleted(): void {
    for (const [id, task] of this.tasks) {
      if (task.status === "completed" || task.status === "failed") {
        this.tasks.delete(id);
      }
    }
    this.notifyListeners();
  }
}

// Singleton instance
export const taskManager = new TaskManager();

// Helper to get task type label
export function getTaskTypeLabel(type: TaskType): string {
  const labels: Record<TaskType, string> = {
    zone: "Zone",
    cluster: "Clusters",
    agent: "Agents",
    simulation: "Simulation",
    poll: "Poll",
  };
  return labels[type];
}

// Helper to get task type icon color
export function getTaskTypeColor(type: TaskType): string {
  const colors: Record<TaskType, string> = {
    zone: "bg-blue-500",
    cluster: "bg-purple-500",
    agent: "bg-orange-500",
    simulation: "bg-green-500",
    poll: "bg-indigo-500",
  };
  return colors[type];
}
