import React, { useState, useMemo, useEffect } from "react";
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
type Priority = "immediate" | "urgent" | "can-wait";

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
    immediate: "bg-[#800000] text-white shadow-sm shadow-[#800000]/20",
    urgent: "bg-red-600 text-white shadow-sm shadow-red-600/20",
    "can-wait": "bg-maroon-200 text-[#800000] border border-[#800000]/20"
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-5 rounded-2xl bg-white shadow-sm border border-gray-100 hover:border-red-200 transition-all mb-3 relative overflow-hidden">
        {/* Priority Indicator Stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          task.priority === 'immediate' ? 'bg-[#800000]' : 
          task.priority === 'urgent' ? 'bg-red-600' : 
          'bg-red-200'
        }`} />

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button 
            onClick={() => toggleTask(task.id)}
            className="text-gray-300 hover:text-[#800000] transition-colors flex-shrink-0"
          >
            {task.completed ? (
              <CheckCircle2 className="w-7 h-7 text-[#800000]" />
            ) : (
              <Circle className="w-7 h-7" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`block truncate text-lg font-bold ${task.completed ? "line-through text-gray-300" : "text-gray-900"}`}>
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
              <p className={`mt-1 text-sm ${task.completed ? "text-gray-300 line-through" : "text-gray-500"} leading-relaxed`}>
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2">
              {task.deadline && (
                <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  timeLeft === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
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

        <div className="flex items-center gap-2 justify-end mt-3 sm:mt-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
          <button 
            onClick={() => setShowInput(!showInput)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-[#800000] hover:bg-red-900 rounded-xl transition-all shadow-md shadow-red-900/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Subtask
          </button>
          <button 
            onClick={() => deleteTask(task.id)}
            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
            title="Delete Task"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {task.subtasks.length > 0 && (
            <button 
              onClick={() => toggleExpand(task.id)}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
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
            className="ml-8 mt-1 mb-4 flex flex-col gap-2 overflow-hidden bg-gray-50 p-4 rounded-xl border border-gray-100"
          >
            <input
              autoFocus
              placeholder="Subtask name..."
              value={subtaskText}
              onChange={(e) => setSubtaskText(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#800000]/10 focus:border-[#800000] transition-all"
            />
            <textarea
              placeholder="Subtask description (optional)..."
              value={subtaskDescription}
              onChange={(e) => setSubtaskDescription(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/10 focus:border-[#800000] transition-all resize-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowInput(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-[#800000] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-900 transition-colors shadow-sm"
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
    <div className="mt-12 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-red-900/5 border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2.5 rounded-2xl">
            <CalendarIcon className="w-6 h-6 text-[#800000]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{monthNames[month]}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{year}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={prevMonth} className="p-3 hover:bg-red-50 text-gray-400 hover:text-[#800000] rounded-2xl transition-all border border-transparent hover:border-red-100">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <button onClick={nextMonth} className="p-3 hover:bg-red-50 text-gray-400 hover:text-[#800000] rounded-2xl transition-all border border-transparent hover:border-red-100">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] py-2">
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
                  ? "border-red-200 bg-red-50/50 ring-2 ring-red-100 ring-offset-2" 
                  : "border-gray-50 bg-gray-50/50 hover:bg-white hover:border-red-200 hover:shadow-lg hover:shadow-red-900/5"
              }`}
            >
              <span className={`text-sm font-black mb-2 transition-colors ${isToday ? "text-[#800000]" : "text-gray-400 group-hover:text-red-400"}`}>
                {day}
              </span>
              <div className="flex-1 w-full overflow-y-auto space-y-1.5 scrollbar-hide">
                {dayTasks.map((t, idx) => (
                  <div 
                    key={idx} 
                    className={`text-[10px] px-2 py-1 rounded-lg truncate font-bold shadow-sm ${
                      t.priority === 'immediate' ? 'bg-[#800000] text-white' : 
                      t.priority === 'urgent' ? 'bg-red-600 text-white' : 
                      'bg-white text-[#800000] border border-red-100'
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
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 font-sans selection:bg-red-100">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Header Section */}
        <header className="mb-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#800000] p-3 rounded-2xl shadow-lg shadow-red-900/20"
                >
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-5xl font-black tracking-tighter text-[#800000]"
                >
                  Checklist
                </motion.h1>
              </div>
              <div className="flex items-center gap-3">
                {showInstallBtn && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleInstall}
                    className="bg-red-50 text-[#800000] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg text-[10px] font-black text-green-700 uppercase tracking-widest border border-green-100"
                    >
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Synced
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-8">
              {nextDeadlineTask && (
                <div className="hidden sm:block text-right border-r border-gray-100 pr-8">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Next Deadline</div>
                  <div className="text-sm font-black text-red-600 truncate max-w-[150px]">{nextDeadlineTask.text}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">
                    {new Date(nextDeadlineTask.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )}
              <div className="text-right">
                <div className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
                  {stats.percent}<span className="text-xl font-bold ml-1 text-gray-300">%</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-2">
                  Overall Progress
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.percent}%` }}
              className="h-full bg-gradient-to-r from-[#800000] to-red-600 rounded-full shadow-sm"
            />
          </div>
        </header>

        {/* Add Task Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addTask}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-red-900/5 border border-gray-100 mb-12 space-y-6 relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-50" />
          
          <div className="space-y-6 relative">
            <div className="flex flex-col gap-6">
              <div className="flex-1">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Task Name</label>
                <input
                  placeholder="What needs to be done?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-base focus:bg-white focus:border-red-100 focus:ring-4 focus:ring-red-500/5 transition-all placeholder:text-gray-300 font-bold text-gray-800"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Task Description</label>
                <textarea
                  placeholder="Add more details about this task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm focus:bg-white focus:border-red-100 focus:ring-4 focus:ring-red-500/5 transition-all placeholder:text-gray-300 font-medium text-gray-700 min-h-[100px] resize-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Set Deadline</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-red-300" />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-14 pr-6 py-4 text-sm focus:bg-white focus:border-red-100 focus:ring-4 focus:ring-red-500/5 transition-all text-gray-700 font-bold appearance-none"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm focus:bg-white focus:border-red-100 focus:ring-4 focus:ring-red-500/5 transition-all text-gray-700 font-bold appearance-none cursor-pointer"
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
                className="w-full bg-[#800000] text-white px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-red-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-red-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
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
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Active Tasks</h3>
            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded-md">{tasks.length} Total</span>
          </div>
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100"
              >
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plus className="w-8 h-8 text-red-200" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">Your list is empty</h4>
                <p className="text-gray-400 text-sm font-medium">Add a task above to get started</p>
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
      </div>
    </div>
  );
}
