import React, { useState, useMemo } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronDown, 
  Trash2,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
interface TaskType {
  id: string;
  text: string;
  deadline: string;
  completed: boolean;
  subtasks: TaskType[];
  isExpanded?: boolean;
}

interface TaskItemProps {
  task: TaskType;
  toggleTask: (id: string) => void;
  addSubtask: (parentId: string, text: string) => void;
  deleteTask: (id: string) => void;
  toggleExpand: (id: string) => void;
}

// --- Recursive Task Component ---
const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  toggleTask, 
  addSubtask, 
  deleteTask,
  toggleExpand
}) => {
  const [showInput, setShowInput] = useState(false);
  const [subtaskText, setSubtaskText] = useState("");

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskText.trim()) return;
    addSubtask(task.id, subtaskText);
    setSubtaskText("");
    setShowInput(false);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group"
    >
      <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
        <button 
          onClick={() => toggleTask(task.id)}
          className="text-gray-400 hover:text-blue-500 transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span className={`block truncate text-sm font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
            {task.text}
          </span>
          {task.deadline && (
            <div className="flex items-center gap-1 text-[10px] text-blue-500 font-semibold uppercase tracking-wider mt-0.5">
              <Clock className="w-3 h-3" />
              {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setShowInput(!showInput)}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
            title="Add Subtask"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => deleteTask(task.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {task.subtasks.length > 0 && (
            <button 
              onClick={() => toggleExpand(task.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              {task.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAddSubtask}
            className="ml-8 mt-1 mb-2 flex gap-2 overflow-hidden"
          >
            <input
              autoFocus
              placeholder="What's the subtask?"
              value={subtaskText}
              onChange={(e) => setSubtaskText(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button 
              type="submit"
              className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Add
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {task.isExpanded && task.subtasks.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-6 border-l border-gray-100 pl-2 overflow-hidden"
          >
            {task.subtasks.map((sub) => (
              <TaskItem
                key={sub.id}
                task={sub}
                toggleTask={toggleTask}
                addSubtask={addSubtask}
                deleteTask={deleteTask}
                toggleExpand={toggleExpand}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Calendar Component ---
function CalendarView({ tasks }: { tasks: TaskType[] }) {
  const groupedTasks = useMemo(() => {
    const dates: Record<string, string[]> = {};
    const collect = (list: TaskType[]) => {
      list.forEach((t) => {
        if (t.deadline) {
          if (!dates[t.deadline]) dates[t.deadline] = [];
          dates[t.deadline].push(t.text);
        }
        collect(t.subtasks);
      });
    };
    collect(tasks);
    return Object.entries(dates).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  if (groupedTasks.length === 0) return null;

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <CalendarIcon className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-800">Upcoming Deadlines</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {groupedTasks.map(([date, items]) => (
          <motion.div 
            key={date}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">
              {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState("");

  const createTask = (text: string, deadline: string): TaskType => ({
    id: Math.random().toString(36).substr(2, 9),
    text,
    deadline,
    completed: false,
    subtasks: [],
    isExpanded: true
  });

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setTasks([...tasks, createTask(text, deadline)]);
    setText("");
    setDeadline("");
  };

  const toggleTask = (id: string) => {
    const toggleRecursive = (list: TaskType[]): TaskType[] =>
      list.map((task) => {
        if (task.id === id) {
          return { ...task, completed: !task.completed };
        }
        return {
          ...task,
          subtasks: toggleRecursive(task.subtasks),
        };
      });
    setTasks(toggleRecursive(tasks));
  };

  const addSubtask = (parentId: string, text: string) => {
    const addRecursive = (list: TaskType[]): TaskType[] =>
      list.map((task) => {
        if (task.id === parentId) {
          return {
            ...task,
            isExpanded: true,
            subtasks: [...task.subtasks, createTask(text, "")],
          };
        }
        return {
          ...task,
          subtasks: addRecursive(task.subtasks),
        };
      });
    setTasks(addRecursive(tasks));
  };

  const deleteTask = (id: string) => {
    const deleteRecursive = (list: TaskType[]): TaskType[] =>
      list.filter((task) => task.id !== id).map((task) => ({
        ...task,
        subtasks: deleteRecursive(task.subtasks),
      }));
    setTasks(deleteRecursive(tasks));
  };

  const toggleExpand = (id: string) => {
    const expandRecursive = (list: TaskType[]): TaskType[] =>
      list.map((task) => {
        if (task.id === id) {
          return { ...task, isExpanded: !task.isExpanded };
        }
        return {
          ...task,
          subtasks: expandRecursive(task.subtasks),
        };
      });
    setTasks(expandRecursive(tasks));
  };

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    const count = (list: TaskType[]) => {
      list.forEach(t => {
        total++;
        if (t.completed) completed++;
        count(t.subtasks);
      });
    };
    count(tasks);
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-blue-100">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        {/* Header Section */}
        <header className="mb-12 space-y-4">
          <div className="flex items-center justify-between">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-bold tracking-tight text-gray-900"
            >
              Checklist
            </motion.h1>
            <div className="text-right">
              <div className="text-3xl font-light text-gray-400">
                {stats.percent}<span className="text-sm font-medium ml-1">%</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Completion
              </div>
            </div>
          </div>
          
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.percent}%` }}
              className="h-full bg-blue-500 rounded-full"
            />
          </div>
        </header>

        {/* Add Task Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addTask}
          className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-10 space-y-4"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                placeholder="What needs to be done?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-600"
              />
            </div>
            <button 
              type="submit"
              disabled={!text.trim()}
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-900/10 active:scale-95"
            >
              Add Task
            </button>
          </div>
        </motion.form>

        {/* Task List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"
              >
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">No tasks yet. Start by adding one above.</p>
              </motion.div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  toggleTask={toggleTask}
                  addSubtask={addSubtask}
                  deleteTask={deleteTask}
                  toggleExpand={toggleExpand}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Calendar Section */}
        <CalendarView tasks={tasks} />
      </div>
    </div>
  );
}
