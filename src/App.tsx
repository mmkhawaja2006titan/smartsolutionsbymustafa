import React, { useState, useMemo, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronDown, 
  Trash2,
  Clock,
  LayoutDashboard,
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudyPlanner } from "./StudyPlanner";

// --- Types ---
type Priority = "immediate" | "urgent" | "can-wait";
type View = "Menu" | "D2D" | "S.Sche";

interface TaskType {
  id: string;
  text: string;
  description: string;
  deadline: string;
  completed: boolean;
  subtasks: TaskType[];
  priority: Priority;
  createdAt: number;
  isExpanded?: boolean;
}

interface TaskItemProps {
  task: TaskType;
  toggleTask: (id: string) => void;
  addSubtask: (parentId: string, text: string, description: string) => void;
  deleteTask: (id: string) => void;
  toggleExpand: (id: string) => void;
  updatePriority: (id: string, priority: Priority) => void;
}

// --- Recursive Task Component ---
const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  toggleTask, 
  addSubtask, 
  deleteTask,
  toggleExpand,
  updatePriority
}) => {
  const [showInput, setShowInput] = useState(false);
  const [subtaskText, setSubtaskText] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!task.deadline) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(task.deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Overdue");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [task.deadline]);

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskText.trim()) return;
    addSubtask(task.id, subtaskText, subtaskDescription);
    setSubtaskText("");
    setSubtaskDescription("");
    setShowInput(false);
  };

  const priorityColors = {
    immediate: "bg-neon-pink text-black shadow-sm shadow-neon-pink/20",
    urgent: "bg-neon-orange text-black shadow-sm shadow-neon-orange/20",
    "can-wait": "bg-neon-blue text-black border border-neon-blue/20"
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-5 rounded-2xl bg-dark-card shadow-sm border border-dark-border hover:border-neon-green transition-all mb-3 relative overflow-hidden">
        {/* Priority Indicator Stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          task.priority === 'immediate' ? 'bg-neon-pink' : 
          task.priority === 'urgent' ? 'bg-neon-orange' : 
          'bg-neon-blue'
        }`} />

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button 
            onClick={() => toggleTask(task.id)}
            className="text-gray-700 hover:text-neon-green transition-colors flex-shrink-0"
          >
            {task.completed ? (
              <CheckCircle2 className="w-7 h-7 text-neon-green" />
            ) : (
              <Circle className="w-7 h-7" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`block truncate text-lg font-bold neon-glow-green ${task.completed ? "line-through text-gray-600" : "text-neon-green"}`}>
                {task.text}
              </span>
              <div className="flex items-center gap-1">
                <select 
                  value={task.priority}
                  onChange={(e) => updatePriority(task.id, e.target.value as Priority)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-tighter border-none focus:ring-0 cursor-pointer transition-all ${priorityColors[task.priority]}`}
                >
                  <option value="immediate">1. Immediate</option>
                  <option value="urgent">2. Urgent</option>
                  <option value="can-wait">3. Can Wait</option>
                </select>
              </div>
            </div>
            
            {task.description && (
              <p className={`mt-1 text-sm ${task.completed ? "text-gray-600 line-through" : "text-gray-400"} leading-relaxed`}>
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              {task.deadline && (
                <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  timeLeft === 'Overdue' ? 'bg-neon-pink/10 text-neon-pink' : 'bg-dark-border text-gray-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  <span className="opacity-60">•</span>
                  <span className={timeLeft === 'Overdue' ? 'animate-pulse' : ''}>{timeLeft}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end mt-3 sm:mt-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-dark-border">
          <button 
            onClick={() => setShowInput(!showInput)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest text-black bg-neon-green hover:bg-neon-green/80 rounded-xl transition-all shadow-md shadow-neon-green/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Subtask
          </button>
          <button 
            onClick={() => deleteTask(task.id)}
            className="p-2.5 text-gray-600 hover:text-neon-pink hover:bg-neon-pink/10 rounded-xl transition-all border border-transparent hover:border-neon-pink/20"
            title="Delete Task"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {task.subtasks.length > 0 && (
            <button 
              onClick={() => toggleExpand(task.id)}
              className="p-2.5 text-gray-600 hover:text-neon-blue hover:bg-neon-blue/10 rounded-xl transition-all"
            >
              {task.isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
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
            className="ml-8 mt-1 mb-4 flex flex-col gap-2 overflow-hidden bg-dark-card p-4 rounded-xl border border-dark-border"
          >
            <input
              autoFocus
              placeholder="Subtask name..."
              value={subtaskText}
              onChange={(e) => setSubtaskText(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm font-bold text-neon-green focus:outline-none focus:ring-2 focus:ring-neon-green/10 focus:border-neon-green transition-all"
            />
            <textarea
              placeholder="Subtask description (optional)..."
              value={subtaskDescription}
              onChange={(e) => setSubtaskDescription(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-green/10 focus:border-neon-green transition-all resize-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowInput(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-neon-green text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-neon-green/80 transition-colors shadow-sm"
              >
                Add Subtask
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {task.isExpanded && task.subtasks.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-6 border-l border-dark-border pl-2 overflow-hidden"
          >
            {task.subtasks.map((sub) => (
              <TaskItem
                key={sub.id}
                task={sub}
                toggleTask={toggleTask}
                addSubtask={addSubtask}
                deleteTask={deleteTask}
                toggleExpand={toggleExpand}
                updatePriority={updatePriority}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Calendar Component ---
function CalendarView({ tasks, onDateSelect }: { tasks: TaskType[], onDateSelect: (date: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(() => {
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const arr = [];

    // Padding for previous month
    for (let i = 0; i < firstDay; i++) {
      arr.push(null);
    }

    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      arr.push(i);
    }

    return arr;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskType[]> = {};
    const collect = (list: TaskType[]) => {
      list.forEach((t) => {
        if (t.deadline) {
          if (!map[t.deadline]) map[t.deadline] = [];
          map[t.deadline].push(t);
        }
        collect(t.subtasks);
      });
    };
    collect(tasks);
    return map;
  }, [tasks]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="mt-12 bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-green/5 border border-dark-border">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-neon-green/10 p-2.5 rounded-2xl">
            <CalendarIcon className="w-6 h-6 text-neon-green" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-neon-green tracking-tight neon-glow-green">{monthNames[month]}</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{year}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={prevMonth} className="p-3 hover:bg-neon-green/10 text-gray-500 hover:text-neon-green rounded-2xl transition-all border border-transparent hover:border-neon-green/20">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <button onClick={nextMonth} className="p-3 hover:bg-neon-green/10 text-gray-500 hover:text-neon-green rounded-2xl transition-all border border-transparent hover:border-neon-green/20">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="h-28" />;
          
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <button 
              key={day} 
              onClick={() => onDateSelect(dateStr)}
              className={`h-28 p-3 rounded-3xl border transition-all overflow-hidden flex flex-col items-start text-left group ${
                isToday 
                  ? "border-neon-green/50 bg-neon-green/5 ring-2 ring-neon-green/20 ring-offset-2 ring-offset-dark-bg" 
                  : "border-dark-border bg-dark-bg/50 hover:bg-dark-card hover:border-neon-green/50 hover:shadow-lg hover:shadow-neon-green/5"
              }`}
            >
              <span className={`text-sm font-black mb-2 transition-colors ${isToday ? "text-neon-green" : "text-gray-600 group-hover:text-neon-green/60"}`}>
                {day}
              </span>
              <div className="flex-1 w-full overflow-y-auto space-y-1.5 scrollbar-hide">
                {dayTasks.map((t, idx) => (
                  <div 
                    key={idx} 
                    className={`text-[10px] px-2 py-1 rounded-lg truncate font-bold shadow-sm ${
                      t.priority === 'immediate' ? 'bg-neon-pink text-black' : 
                      t.priority === 'urgent' ? 'bg-neon-orange text-black' : 
                      'bg-dark-border text-neon-blue border border-neon-blue/20'
                    }`}
                    title={t.text}
                  >
                    {t.text}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [tasks, setTasks] = useState<TaskType[]>(() => {
    try {
      const saved = localStorage.getItem("checklist_tasks");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load tasks", e);
      return [];
    }
  });
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("can-wait");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [activeView, setActiveView] = useState<View>("Menu");

  // Persistence Logic
  useEffect(() => {
    localStorage.setItem("checklist_tasks", JSON.stringify(tasks));
    setIsSaved(true);
    const timer = setTimeout(() => setIsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [tasks]);

  // PWA Install Logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const createTask = (text: string, description: string, deadline: string, p: Priority = "can-wait"): TaskType => ({
    id: Math.random().toString(36).substr(2, 9),
    text,
    description,
    deadline,
    completed: false,
    subtasks: [],
    priority: p,
    createdAt: Date.now(),
    isExpanded: true
  });

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setTasks([...tasks, createTask(text, description, deadline, priority)]);
    setText("");
    setDescription("");
    setDeadline("");
    setPriority("can-wait");
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

  const addSubtask = (parentId: string, text: string, description: string) => {
    const addRecursive = (list: TaskType[]): TaskType[] =>
      list.map((task) => {
        if (task.id === parentId) {
          return {
            ...task,
            isExpanded: true,
            subtasks: [...task.subtasks, createTask(text, description, "", "can-wait")],
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

  const updatePriority = (id: string, p: Priority) => {
    const updateRecursive = (list: TaskType[]): TaskType[] =>
      list.map((task) => {
        if (task.id === id) {
          return { ...task, priority: p };
        }
        return {
          ...task,
          subtasks: updateRecursive(task.subtasks),
        };
      });
    setTasks(updateRecursive(tasks));
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

  const nextDeadlineTask = useMemo(() => {
    const allTasks: TaskType[] = [];
    const collect = (list: TaskType[]) => {
      list.forEach(t => {
        if (t.deadline && !t.completed) allTasks.push(t);
        collect(t.subtasks);
      });
    };
    collect(tasks);
    return allTasks
      .filter(t => new Date(t.deadline).getTime() > Date.now())
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
  }, [tasks]);

  return (
    <div className="min-h-screen bg-dark-bg text-white font-sans selection:bg-neon-green/20">
      {/* Navigation Menu */}
      {activeView !== "Menu" && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <button 
              onClick={() => setActiveView("Menu")}
              className="flex items-center gap-2 relative group"
            >
              <div className="bg-neon-green p-1.5 rounded-lg shadow-[0_0_10px_rgba(57,255,20,0.5)] group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-black tracking-tighter text-neon-green neon-glow-green">S.Plan</span>
            </button>
            <div className="flex bg-dark-card p-1 rounded-xl border border-dark-border">
              <button 
                onClick={() => setActiveView("D2D")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  activeView === 'D2D' ? 'bg-dark-bg text-neon-green shadow-sm neon-glow-green' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                D2D
              </button>
              <button 
                onClick={() => setActiveView("S.Sche")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  activeView === 'S.Sche' ? 'bg-dark-bg text-neon-green shadow-sm neon-glow-green' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                S.Sche
              </button>
            </div>
          </div>
        </nav>
      )}

      <div className="max-w-4xl mx-auto px-6 py-24 md:py-32">
        <AnimatePresence mode="wait">
          {activeView === "Menu" ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="min-h-[70vh] flex flex-col items-center justify-center relative"
            >
              {/* Big Polar Bears */}
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -left-10 text-8xl md:text-9xl opacity-20 pointer-events-none select-none"
              >
                🐻‍❄️
              </motion.div>
              <motion.div
                animate={{ 
                  y: [0, 15, 0],
                  rotate: [0, -8, 8, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-20 -right-10 text-8xl md:text-9xl opacity-20 pointer-events-none select-none"
              >
                🐻‍❄️
              </motion.div>

              <div className="text-center mb-16 space-y-6">
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block bg-neon-green p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(57,255,20,0.3)] mb-4"
                >
                  <CheckCircle2 className="w-20 h-20 text-black" />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-neon-green neon-glow-green uppercase">
                    S.Plan
                  </h1>
                  <p className="text-sm font-black text-gray-500 uppercase tracking-[0.5em] mt-2">
                    Ultimate Productivity Suite
                  </p>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView("D2D")}
                  className="group relative bg-dark-card border-2 border-dark-border p-10 rounded-[3rem] text-left transition-all hover:border-neon-green hover:shadow-[0_0_30px_rgba(57,255,20,0.1)] overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                    <LayoutDashboard className="w-32 h-32 text-neon-green" />
                  </div>
                  <div className="relative z-10">
                    <div className="bg-neon-green/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-neon-green/20">
                      <LayoutDashboard className="w-8 h-8 text-neon-green" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">D2D</h2>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                      Day-to-Day task management with recursive subtasks and priority tracking.
                    </p>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView("S.Sche")}
                  className="group relative bg-dark-card border-2 border-dark-border p-10 rounded-[3rem] text-left transition-all hover:border-neon-blue hover:shadow-[0_0_30px_rgba(0,243,255,0.1)] overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                    <CalendarDays className="w-32 h-32 text-neon-blue" />
                  </div>
                  <div className="relative z-10">
                    <div className="bg-neon-blue/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-neon-blue/20">
                      <CalendarDays className="w-8 h-8 text-neon-blue" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">S.Sche</h2>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                      Advanced Study Scheduler with AI-driven time allocation and break management.
                    </p>
                  </div>
                </motion.button>
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-16 text-[10px] font-black text-gray-700 uppercase tracking-[0.3em]"
              >
                "If you can plan it, you can make it"
              </motion.div>
            </motion.div>
          ) : activeView === "D2D" ? (
            <motion.div 
              key="d2d"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Header Section */}
              <header className="mb-16 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-neon-green p-3 rounded-2xl shadow-lg shadow-neon-green/20"
                      >
                        <CheckCircle2 className="w-8 h-8 text-black" />
                      </motion.div>
                      <motion.h1 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-5xl font-black tracking-tighter text-neon-green neon-glow-green"
                      >
                        D2D
                      </motion.h1>
                    </div>
                    <div className="flex items-center gap-3">
                      {showInstallBtn && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={handleInstall}
                          className="bg-neon-green/10 text-neon-green px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-green/20 transition-all flex items-center gap-2 border border-neon-green/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Install App
                        </motion.button>
                      )}
                      <AnimatePresence>
                        {isSaved && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-blue/10 rounded-lg text-[10px] font-black text-neon-blue uppercase tracking-widest border border-neon-blue/20"
                          >
                            <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-pulse shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
                            Synced
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {nextDeadlineTask && (
                      <div className="hidden sm:block text-right border-r border-dark-border pr-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Next Deadline</div>
                        <div className="text-sm font-black text-neon-pink truncate max-w-[150px]">{nextDeadlineTask.text}</div>
                        <div className="text-[11px] font-bold text-gray-600 mt-0.5">
                          {new Date(nextDeadlineTask.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-5xl font-black text-neon-green tracking-tighter leading-none neon-glow-green">
                        {stats.percent}<span className="text-xl font-bold ml-1 text-gray-600">%</span>
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-2">
                        Overall Progress
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="h-3 w-full bg-dark-card rounded-full overflow-hidden p-0.5 border border-dark-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.percent}%` }}
                    className="h-full bg-gradient-to-r from-neon-green to-neon-blue rounded-full shadow-[0_0_10px_rgba(57,255,20,0.3)]"
                  />
                </div>
              </header>

              {/* Add Task Form */}
              <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={addTask}
                className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-green/5 border border-dark-border mb-12 space-y-6 relative overflow-hidden"
              >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full -mr-16 -mt-16 opacity-50" />
                
                <div className="space-y-6 relative">
                  <div className="flex flex-col gap-6">
                    <div className="flex-1">
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Task Name</label>
                      <input
                        placeholder="What needs to be done?"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full bg-dark-bg border-2 border-transparent rounded-2xl px-6 py-4 text-base focus:bg-dark-card focus:border-neon-green/50 focus:ring-4 focus:ring-neon-green/5 transition-all placeholder:text-gray-700 font-bold text-neon-green"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Task Description</label>
                      <textarea
                        placeholder="Add more details about this task..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-dark-bg border-2 border-transparent rounded-2xl px-6 py-4 text-sm focus:bg-dark-card focus:border-neon-green/50 focus:ring-4 focus:ring-neon-green/5 transition-all placeholder:text-gray-700 font-medium text-gray-400 min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Set Deadline</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-green/50" />
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full bg-dark-bg border-2 border-transparent rounded-2xl pl-14 pr-6 py-4 text-sm focus:bg-dark-card focus:border-neon-green/50 focus:ring-4 focus:ring-neon-green/5 transition-all text-neon-green font-bold appearance-none"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Priority Level</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Priority)}
                        className="w-full bg-dark-bg border-2 border-transparent rounded-2xl px-6 py-4 text-sm focus:bg-dark-card focus:border-neon-green/50 focus:ring-4 focus:ring-neon-green/5 transition-all text-neon-green font-bold appearance-none cursor-pointer"
                      >
                        <option value="immediate">1. Immediate Response</option>
                        <option value="urgent">2. Urgent</option>
                        <option value="can-wait">3. Can Wait</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={!text.trim()}
                      className="w-full bg-neon-green text-black px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-neon-green/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-neon-green/20 active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      <Plus className="w-6 h-6" />
                      Create Task
                    </button>
                  </div>
                </div>
              </motion.form>

              {/* Task List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2 mb-4">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Active Tasks</h3>
                  <span className="text-[10px] font-bold text-neon-pink bg-neon-pink/10 px-2 py-1 rounded-md border border-neon-pink/20">{tasks.length} Total</span>
                </div>
                <AnimatePresence mode="popLayout">
                  {tasks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-24 bg-dark-card rounded-[2.5rem] border-2 border-dashed border-dark-border"
                    >
                      <div className="bg-neon-green/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Plus className="w-8 h-8 text-neon-green/20" />
                      </div>
                      <h4 className="text-lg font-bold text-neon-green mb-1 neon-glow-green">Your list is empty</h4>
                      <p className="text-gray-600 text-sm font-medium">Add a task above to get started</p>
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
                        updatePriority={updatePriority}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Calendar Section */}
              <CalendarView tasks={tasks} onDateSelect={(date) => {
                setDeadline(date);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} />
            </motion.div>
          ) : (
            <motion.div 
              key="ssche"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StudyPlanner />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
