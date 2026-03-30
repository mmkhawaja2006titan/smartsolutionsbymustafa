import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen, 
  Brain, 
  Moon, 
  Sun, 
  Coffee,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Edit2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  addDays, 
  differenceInDays, 
  parseISO, 
  startOfDay, 
  addHours, 
  addMinutes,
  setHours, 
  setMinutes,
  isSameDay,
  eachDayOfInterval
} from "date-fns";

// --- Types ---
export type Difficulty = "Str8t F" | "maybe F" | "passable" | "acing it";

export interface Subject {
  id: string;
  name: string;
  difficulty: Difficulty;
  allocatedHours: number;
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  startTime: Date;
  endTime: Date;
  isBreak: boolean;
}

export interface StudyPlan {
  startDate: string;
  endDate: string;
  studyDaysMode: "all" | "weekdays" | "custom";
  selectedStudyDays: string[];
  subjects: Subject[];
  studyHoursPerDay: number;
  sleepHours: number;
  bedtime: string; // "HH:mm"
  preference: "early morning" | "late night";
  needsBreaks: boolean;
  sessions: StudySession[];
}

// --- Constants ---
const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  "Str8t F": 4,
  "maybe F": 3,
  "passable": 2,
  "acing it": 1
};

// --- Helper Components ---
const InputLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[11px] font-black text-neon-blue uppercase tracking-[0.2em] mb-2.5 ml-1">
    {children}
  </label>
);

// --- Main Component ---
export const StudyPlanner: React.FC = () => {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<StudyPlan | null>(() => {
    const saved = localStorage.getItem("s_sche_plan");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert ISO strings back to Date objects for sessions
        parsed.sessions = parsed.sessions.map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime)
        }));
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Form State
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [studyDaysMode, setStudyDaysMode] = useState<"all" | "weekdays" | "custom">("all");
  const [selectedStudyDays, setSelectedStudyDays] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(6);
  const [sleepHours, setSleepHours] = useState(8);
  const [bedtime, setBedtime] = useState("23:00");
  const [preference, setPreference] = useState<"early morning" | "late night">("early morning");
  const [needsBreaks, setNeedsBreaks] = useState(true);

  // Temporary subject input
  const [newSubName, setNewSubName] = useState("");
  const [newSubDiff, setNewSubDiff] = useState<Difficulty>("passable");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addSubject = () => {
    if (!newSubName.trim()) return;
    const newSub: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSubName,
      difficulty: newSubDiff,
      allocatedHours: 0 // Will be calculated
    };
    setSubjects([...subjects, newSub]);
    setNewSubName("");
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const [editingSession, setEditingSession] = useState<StudySession | null>(null);

  const generatePlan = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // 1. Determine active study days
    let days = eachDayOfInterval({ start, end });
    if (studyDaysMode === "weekdays") {
      days = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
    } else if (studyDaysMode === "custom") {
      days = days.filter(d => selectedStudyDays.includes(format(d, "yyyy-MM-dd")));
    }

    if (days.length === 0) {
      setErrorMessage("No study days selected in the given range.");
      return;
    }

    const totalDays = days.length;
    const totalStudyHours = totalDays * studyHoursPerDay;

    // Round to 15 min multiples
    let updatedSubjects = subjects.map(sub => {
      let hours = 0;
      if (sub.difficulty === "acing it") {
        hours = totalDays / 3;
      } else if (sub.difficulty === "Str8t F") {
        hours = totalStudyHours * 0.5;
      } else if (sub.difficulty === "maybe F") {
        hours = totalStudyHours * 0.3;
      } else {
        hours = totalStudyHours * 0.15;
      }
      return { ...sub, allocatedHours: Math.round(hours * 4) / 4 };
    });

    // Normalize
    const currentSum = updatedSubjects.reduce((acc, s) => acc + s.allocatedHours, 0);
    if (currentSum > totalStudyHours) {
      const ratio = totalStudyHours / currentSum;
      updatedSubjects = updatedSubjects.map(s => ({
        ...s,
        allocatedHours: Math.round(s.allocatedHours * ratio * 4) / 4
      }));
    } else if (currentSum < totalStudyHours && updatedSubjects.length > 0) {
      const diff = totalStudyHours - currentSum;
      const hardest = updatedSubjects.find(s => s.difficulty === "Str8t F") || updatedSubjects[0];
      hardest.allocatedHours = Math.round((hardest.allocatedHours + diff) * 4) / 4;
    }

    // 2. Create Sessions
    const sessions: StudySession[] = [];
    const [bedH, bedM] = bedtime.split(":").map(Number);
    
    // Base window calculation
    const wakeUpH = (bedH + sleepHours) % 24;
    const baseStartH = (wakeUpH + 2) % 24; // Default: 2 hours after waking
    const baseEndH = (bedH - 1 + 24) % 24; // Default: 1 hour before bedtime
    const baseWindowSize = (baseEndH - baseStartH + 24) % 24;

    const numSessions = needsBreaks ? Math.ceil(studyHoursPerDay / 0.75) : 0;
    const totalBlockNeeded = needsBreaks 
      ? (studyHoursPerDay + numSessions * 0.25) 
      : (studyHoursPerDay + Math.floor((studyHoursPerDay - 0.01) / 3) * 0.5);

    // Validation
    if (totalBlockNeeded > baseWindowSize + 0.01) {
      setErrorMessage("Routine not humanely possible. Your approach needs to be adjusted. Try changing the time slots of study or sleep.");
      return;
    }

    // Determine if we should split (more than 4 sessions and enough free time for a gap)
    const shouldSplit = needsBreaks && numSessions > 4 && (baseWindowSize - totalBlockNeeded) >= 2;
    
    let startStudyH = baseStartH;
    let endStudyH = baseEndH;

    if (!shouldSplit && studyHoursPerDay > 3 && needsBreaks) {
      // If not splitting, shift the entire block to the preferred region
      if (preference === "early morning") {
        endStudyH = (startStudyH + totalBlockNeeded) % 24;
      } else {
        startStudyH = (endStudyH - totalBlockNeeded + 24) % 24;
      }
    }

    let remainingSubjectHours = updatedSubjects.map(s => ({ ...s }));

    let lastSubjectId = "";
    let consecutiveCount = 0;

    days.forEach(day => {
      let dailyStudyRemaining = studyHoursPerDay;
      let currentPointer = setMinutes(setHours(startOfDay(day), startStudyH), 0);
      let studySinceLastBreak = 0;
      let sessionCount = 0;

      const preferredSessionsCount = shouldSplit ? Math.ceil(numSessions * 0.7) : numSessions;
      const otherSessionsCount = numSessions - preferredSessionsCount;

      while (dailyStudyRemaining > 0) {
        const availableSubjects = remainingSubjectHours
          .map((s, idx) => ({ ...s, originalIdx: idx }))
          .filter(s => s.allocatedHours > 0)
          .sort((a, b) => b.allocatedHours - a.allocatedHours);

        if (availableSubjects.length === 0) break;

        let subIndex = -1;
        if (consecutiveCount >= 3) {
          const otherSub = availableSubjects.find(s => s.id !== lastSubjectId);
          if (otherSub) subIndex = otherSub.originalIdx;
        }
        
        if (subIndex === -1) {
          subIndex = availableSubjects[0].originalIdx;
        }

        const sub = remainingSubjectHours[subIndex];

        // Session duration: max 2h, min 45m, multiples of 15m
        let sessionDuration = Math.min(2, dailyStudyRemaining, sub.allocatedHours);
        sessionDuration = Math.round(sessionDuration * 4) / 4;

        if (sessionDuration <= 0) {
          sub.allocatedHours = 0;
          continue;
        }

        // Minimum 45m (0.75h) rule
        if (sessionDuration < 0.75) {
          // Add to previous session of the same subject if it exists
          const lastSess = sessions.slice().reverse().find(s => s.subjectId === sub.id && !s.isBreak);
          if (lastSess) {
            lastSess.endTime = addMinutes(lastSess.endTime, sessionDuration * 60);
            sub.allocatedHours -= sessionDuration;
            // We don't advance currentPointer because we didn't place a new block
            // But we still "consumed" this time from the daily budget? 
            // Actually, if we add it to a previous session, we are essentially saying 
            // "we studied more earlier". To keep the daily budget accurate:
            dailyStudyRemaining -= sessionDuration;
            continue;
          } else {
            // First session of this subject, force 45m if possible
            sessionDuration = Math.min(0.75, sub.allocatedHours, dailyStudyRemaining);
          }
        }

        if (needsBreaks) {
          // 45 min study + 15 min break
          const actualStudy = Math.min(0.75, sessionDuration);
          sessions.push({
            id: Math.random().toString(36).substr(2, 9),
            subjectId: sub.id,
            subjectName: sub.name,
            startTime: currentPointer,
            endTime: addMinutes(currentPointer, actualStudy * 60),
            isBreak: false
          });
          sessions.push({
            id: Math.random().toString(36).substr(2, 9),
            subjectId: "break",
            subjectName: "Break",
            startTime: addMinutes(currentPointer, actualStudy * 60),
            endTime: addMinutes(currentPointer, (actualStudy + 0.25) * 60),
            isBreak: true
          });
          currentPointer = addMinutes(currentPointer, (actualStudy + 0.25) * 60);
          sub.allocatedHours -= actualStudy;
          dailyStudyRemaining -= actualStudy;
          sessionCount++;

          // Splitting logic: Jump to the next block if we finished the first part
          if (shouldSplit) {
            if (preference === "late night" && sessionCount === otherSessionsCount) {
              // Jump to start the preferred block so it ends at baseEndH
              const remainingSessions = preferredSessionsCount;
              const remainingTimeNeeded = remainingSessions * 1.0; // 45m study + 15m break = 1h
              const targetStart = (baseEndH - remainingTimeNeeded + 24) % 24;
              currentPointer = setMinutes(setHours(startOfDay(day), targetStart), 0);
            } else if (preference === "early morning" && sessionCount === preferredSessionsCount) {
              // Jump to start the other block so it ends at baseEndH
              const remainingSessions = otherSessionsCount;
              const remainingTimeNeeded = remainingSessions * 1.0;
              const targetStart = (baseEndH - remainingTimeNeeded + 24) % 24;
              currentPointer = setMinutes(setHours(startOfDay(day), targetStart), 0);
            }
          }
          
          if (sub.id === lastSubjectId) consecutiveCount++;
          else { lastSubjectId = sub.id; consecutiveCount = 1; }
        } else {
          // No break mode: 30 min break after every 3 hours
          const actualStudy = sessionDuration;
          sessions.push({
            id: Math.random().toString(36).substr(2, 9),
            subjectId: sub.id,
            subjectName: sub.name,
            startTime: currentPointer,
            endTime: addMinutes(currentPointer, actualStudy * 60),
            isBreak: false
          });
          currentPointer = addMinutes(currentPointer, actualStudy * 60);
          sub.allocatedHours -= actualStudy;
          dailyStudyRemaining -= actualStudy;
          studySinceLastBreak += actualStudy;

          if (studySinceLastBreak >= 3) {
            sessions.push({
              id: Math.random().toString(36).substr(2, 9),
              subjectId: "break",
              subjectName: "Break",
              startTime: currentPointer,
              endTime: addMinutes(currentPointer, 30),
              isBreak: true
            });
            currentPointer = addMinutes(currentPointer, 30);
            studySinceLastBreak = 0;
          }

          if (sub.id === lastSubjectId) consecutiveCount++;
          else { lastSubjectId = sub.id; consecutiveCount = 1; }
        }
      }
    });

    const newPlan: StudyPlan = {
      startDate,
      endDate,
      studyDaysMode,
      selectedStudyDays,
      subjects: updatedSubjects,
      studyHoursPerDay,
      sleepHours,
      bedtime,
      preference,
      needsBreaks,
      sessions
    };

    setPlan(newPlan);
    localStorage.setItem("s_sche_plan", JSON.stringify(newPlan));
    setStep(4);
  };

  const updateSubjectHours = (id: string, hours: number) => {
    if (!plan) return;
    const newSubjects = plan.subjects.map(s => s.id === id ? { ...s, allocatedHours: hours } : s);
    const newPlan = { ...plan, subjects: newSubjects };
    setPlan(newPlan);
    localStorage.setItem("s_sche_plan", JSON.stringify(newPlan));
  };

  const resetPlan = () => {
    setPlan(null);
    setSubjects([]);
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setStudyDaysMode("all");
    setSelectedStudyDays([]);
    setStudyHoursPerDay(6);
    setSleepHours(8);
    setBedtime("23:00");
    setPreference("early morning");
    setNeedsBreaks(true);
    setNewSubName("");
    setNewSubDiff("passable");
    localStorage.removeItem("s_sche_plan");
    setStep(1);
    setShowResetConfirm(false);
  };

  const replan = () => {
    setPlan(null);
    setStep(3);
  };

  const deleteSession = (sessionId: string) => {
    if (!plan) return;
    const newSessions = plan.sessions.filter(s => s.id !== sessionId);
    const newPlan = { ...plan, sessions: newSessions };
    setPlan(newPlan);
    localStorage.setItem("s_sche_plan", JSON.stringify(newPlan));
  };

  const updateSession = (updated: StudySession) => {
    if (!plan) return;
    const newSessions = plan.sessions.map(s => s.id === updated.id ? updated : s);
    const newPlan = { ...plan, sessions: newSessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()) };
    setPlan(newPlan);
    localStorage.setItem("s_sche_plan", JSON.stringify(newPlan));
    setEditingSession(null);
  };

  const addManualSession = (day: Date, isBreak: boolean) => {
    if (!plan) return;
    const subject = plan.subjects[0] || { id: "custom", name: "Custom Study" };
    const newSession: StudySession = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: isBreak ? "break" : subject.id,
      subjectName: isBreak ? "Break" : subject.name,
      startTime: setMinutes(setHours(day, 12), 0),
      endTime: setMinutes(setHours(day, 12), 45), // Default 45m
      isBreak
    };
    const newPlan = { ...plan, sessions: [...plan.sessions, newSession].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()) };
    setPlan(newPlan);
    localStorage.setItem("s_sche_plan", JSON.stringify(newPlan));
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {step === 1 && !plan && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-blue/5 border border-dark-border"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-dark-bg p-3 rounded-2xl border border-neon-blue/20">
                <CalendarIcon className="w-8 h-8 text-neon-blue" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight neon-glow-blue">Set Date Range</h2>
                <p className="text-sm font-bold text-gray-500">When does your routine start and end?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <InputLabel>Start Date</InputLabel>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-6 py-4 text-base focus:bg-dark-bg focus:border-neon-blue transition-all font-bold text-white"
                />
              </div>
              <div>
                <InputLabel>End Date</InputLabel>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-6 py-4 text-base focus:bg-dark-bg focus:border-neon-blue transition-all font-bold text-white"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 bg-neon-blue text-black px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-neon-blue/80 transition-all flex items-center justify-center gap-3 shadow-xl shadow-neon-blue/20"
              >
                Next: Study Days
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && !plan && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-blue/5 border border-dark-border"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-dark-bg p-3 rounded-2xl border border-neon-blue/20">
                <CalendarIcon className="w-8 h-8 text-neon-blue" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight neon-glow-blue">Study Days</h2>
                <p className="text-sm font-bold text-gray-500">Which days of the week do you want to study?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button 
                onClick={() => setStudyDaysMode("all")}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                  studyDaysMode === 'all' ? 'bg-dark-bg border-neon-blue text-neon-blue' : 'bg-dark-bg border-dark-border text-gray-500'
                }`}
              >
                <Sun className="w-8 h-8" />
                <span className="text-xs font-black uppercase tracking-widest">All Days</span>
              </button>
              <button 
                onClick={() => setStudyDaysMode("weekdays")}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                  studyDaysMode === 'weekdays' ? 'bg-dark-bg border-neon-blue text-neon-blue' : 'bg-dark-bg border-dark-border text-gray-500'
                }`}
              >
                <Clock className="w-8 h-8" />
                <span className="text-xs font-black uppercase tracking-widest">Weekdays</span>
              </button>
              <button 
                onClick={() => setStudyDaysMode("custom")}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                  studyDaysMode === 'custom' ? 'bg-dark-bg border-neon-blue text-neon-blue' : 'bg-dark-bg border-dark-border text-gray-500'
                }`}
              >
                <Edit2 className="w-8 h-8" />
                <span className="text-xs font-black uppercase tracking-widest">Customise</span>
              </button>
            </div>

            {studyDaysMode === "custom" && (
              <div className="mb-8 p-6 bg-dark-bg rounded-3xl border border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <InputLabel>Select Study Days</InputLabel>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const allDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map(d => format(d, "yyyy-MM-dd"));
                        setSelectedStudyDays(allDays);
                      }}
                      className="text-[10px] font-black text-neon-blue uppercase tracking-widest hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-dark-border">|</span>
                    <button 
                      onClick={() => setSelectedStudyDays([])}
                      className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map(day => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isSelected = selectedStudyDays.includes(dateStr);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStudyDays(selectedStudyDays.filter(d => d !== dateStr));
                          } else {
                            setSelectedStudyDays([...selectedStudyDays, dateStr]);
                          }
                        }}
                        className={`p-3 rounded-xl text-[10px] font-black transition-all border ${
                          isSelected 
                            ? 'bg-neon-blue text-black border-neon-blue' 
                            : 'bg-dark-card text-gray-500 border-dark-border hover:border-neon-blue/50'
                        }`}
                      >
                        <div className="uppercase opacity-50">{format(day, "EEE")}</div>
                        <div className="text-sm">{format(day, "d")}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 bg-dark-bg text-gray-500 px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-dark-border transition-all flex items-center justify-center gap-3 border border-dark-border"
              >
                <ChevronLeft className="w-6 h-6" />
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                disabled={studyDaysMode === "custom" && selectedStudyDays.length === 0}
                className="flex-[2] bg-neon-blue text-black px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-neon-blue/80 disabled:opacity-30 transition-all flex items-center justify-center gap-3 shadow-xl shadow-neon-blue/20"
              >
                Next: Subjects & Preferences
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && !plan && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Subjects Section */}
            <div className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-blue/5 border border-dark-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-dark-bg p-3 rounded-2xl border border-neon-blue/20">
                  <BookOpen className="w-8 h-8 text-neon-blue" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight neon-glow-blue">Your Subjects</h2>
                  <p className="text-sm font-bold text-gray-500">Add subjects and their difficulty</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input 
                    placeholder="Subject Name (e.g. Math, History)"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-6 py-4 text-base focus:bg-dark-bg focus:border-neon-blue transition-all font-bold text-white"
                  />
                </div>
                <div className="md:w-64">
                  <select 
                    value={newSubDiff}
                    onChange={(e) => setNewSubDiff(e.target.value as Difficulty)}
                    className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-6 py-4 text-sm focus:bg-dark-bg focus:border-neon-blue transition-all font-bold appearance-none cursor-pointer text-white"
                  >
                    <option value="Str8t F">Str8t F (Hardest)</option>
                    <option value="maybe F">maybe F</option>
                    <option value="passable">passable</option>
                    <option value="acing it">acing it (Easiest)</option>
                  </select>
                </div>
                <button 
                  onClick={addSubject}
                  className="bg-neon-blue text-black p-4 rounded-2xl hover:bg-neon-blue/80 transition-all shadow-lg shadow-neon-blue/20"
                >
                  <Plus className="w-8 h-8" />
                </button>
              </div>

              <div className="space-y-3">
                {subjects.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-dark-bg rounded-2xl border border-dark-border">
                    <div>
                      <span className="font-black text-white">{s.name}</span>
                      <span className={`ml-3 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        s.difficulty === 'Str8t F' ? 'bg-neon-pink/20 text-neon-pink' :
                        s.difficulty === 'maybe F' ? 'bg-neon-orange/20 text-neon-orange' :
                        s.difficulty === 'passable' ? 'bg-neon-blue/20 text-neon-blue' :
                        'bg-neon-green/20 text-neon-green'
                      }`}>
                        {s.difficulty}
                      </span>
                    </div>
                    <button onClick={() => removeSubject(s.id)} className="text-gray-500 hover:text-neon-pink transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-blue/5 border border-dark-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-dark-bg p-3 rounded-2xl border border-neon-blue/20">
                  <Brain className="w-8 h-8 text-neon-blue" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight neon-glow-blue">Routine Details</h2>
                  <p className="text-sm font-bold text-gray-500">Customize your study habits</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <InputLabel>Study Hours Per Day</InputLabel>
                    <input 
                      type="number" 
                      value={studyHoursPerDay}
                      onChange={(e) => setStudyHoursPerDay(Number(e.target.value))}
                      className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-6 py-4 text-base focus:bg-dark-bg focus:border-neon-blue transition-all font-bold text-white"
                    />
                  </div>
                  <div>
                    <InputLabel>Sleep Hours</InputLabel>
                    <input 
                      type="number" 
                      value={sleepHours}
                      onChange={(e) => setSleepHours(Number(e.target.value))}
                      className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-6 py-4 text-base focus:bg-dark-bg focus:border-neon-blue transition-all font-bold text-white"
                    />
                  </div>
                  <div>
                    <InputLabel>Bedtime</InputLabel>
                    <input 
                      type="time" 
                      value={bedtime}
                      onChange={(e) => setBedtime(e.target.value)}
                      className="w-full bg-dark-bg border-2 border-dark-border rounded-2xl px-6 py-4 text-base focus:bg-dark-bg focus:border-neon-blue transition-all font-bold text-white"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <InputLabel>Study Preference</InputLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPreference("early morning")}
                        className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                          preference === 'early morning' ? 'bg-dark-bg border-neon-blue text-neon-blue' : 'bg-dark-bg border-dark-border text-gray-500'
                        }`}
                      >
                        <Sun className="w-8 h-8" />
                        <span className="text-xs font-black uppercase tracking-widest">Early Morning</span>
                      </button>
                      <button 
                        onClick={() => setPreference("late night")}
                        className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                          preference === 'late night' ? 'bg-dark-bg border-neon-blue text-neon-blue' : 'bg-dark-bg border-dark-border text-gray-500'
                        }`}
                      >
                        <Moon className="w-8 h-8" />
                        <span className="text-xs font-black uppercase tracking-widest">Late Night</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <InputLabel>Need Breaks?</InputLabel>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setNeedsBreaks(true)}
                        className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          needsBreaks ? 'bg-dark-bg border-neon-blue text-neon-blue' : 'bg-dark-bg border-dark-border text-gray-500'
                        }`}
                      >
                        <Coffee className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Yes (15m/h)</span>
                      </button>
                      <button 
                        onClick={() => setNeedsBreaks(false)}
                        className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                          !needsBreaks ? 'bg-dark-bg border-neon-blue text-neon-blue' : 'bg-dark-bg border-dark-border text-gray-500'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">No Breaks</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-12">
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 bg-dark-bg text-gray-500 px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-dark-border transition-all flex items-center justify-center gap-3 border border-dark-border"
                >
                  <ChevronLeft className="w-6 h-6" />
                  Back
                </button>
                <button 
                  onClick={generatePlan}
                  disabled={subjects.length === 0}
                  className="flex-[2] bg-neon-blue text-black px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-neon-blue/80 disabled:opacity-30 transition-all flex items-center justify-center gap-3 shadow-xl shadow-neon-blue/20"
                >
                  Generate Plan
                  <Save className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {plan && (
          <motion.div 
            key="planView"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Summary & Controls */}
            <div className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-blue/5 border border-dark-border flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-dark-bg p-3 rounded-2xl border border-neon-green/20">
                  <CheckCircle2 className="w-8 h-8 text-neon-green" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight neon-glow-green">Your Plan is Ready</h2>
                  <p className="text-sm font-bold text-gray-500">
                    {format(parseISO(plan.startDate), "MMM d")} - {format(parseISO(plan.endDate), "MMM d")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={replan}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-neon-blue bg-dark-bg hover:bg-dark-border transition-all border border-neon-blue/20"
                >
                  Re-plan
                </button>
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 bg-dark-bg hover:bg-dark-border transition-all border border-dark-border"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Subject Time Allocation */}
            <div className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-blue/5 border border-dark-border">
              <h3 className="text-xs font-black text-neon-blue uppercase tracking-[0.2em] mb-6">Time Allocation (Manual Override)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plan.subjects.map(s => (
                  <div key={s.id} className="p-5 bg-dark-bg rounded-2xl border border-dark-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{s.name}</span>
                      <span className="text-[10px] font-black text-gray-500 uppercase">{s.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        value={s.allocatedHours}
                        onChange={(e) => updateSubjectHours(s.id, Number(e.target.value))}
                        className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue outline-none transition-all text-white"
                      />
                      <span className="text-xs font-bold text-gray-500">hrs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Calendar View */}
            <div className="bg-dark-card p-8 rounded-[2.5rem] shadow-xl shadow-neon-blue/5 border border-dark-border overflow-hidden">
              <h3 className="text-xs font-black text-neon-blue uppercase tracking-[0.2em] mb-8">Detailed Hourly Schedule</h3>
              
              <div className="space-y-12">
                {eachDayOfInterval({ start: parseISO(plan.startDate), end: parseISO(plan.endDate) }).map(day => {
                  const daySessions = plan.sessions.filter(s => isSameDay(s.startTime, day));
                  if (daySessions.length === 0) return null;

                  return (
                    <div key={day.toISOString()} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-dark-border pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-neon-blue text-black w-10 h-10 rounded-xl flex items-center justify-center font-black">
                            {format(day, "d")}
                          </div>
                          <div>
                            <h4 className="font-black text-white">{format(day, "EEEE")}</h4>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{format(day, "MMMM yyyy")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => addManualSession(day, false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-neon-green bg-dark-bg hover:bg-dark-border transition-all border border-neon-green/20"
                          >
                            <Plus className="w-3 h-3" /> Study
                          </button>
                          <button 
                            onClick={() => addManualSession(day, true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 bg-dark-bg hover:bg-dark-border transition-all border border-dark-border"
                          >
                            <Plus className="w-3 h-3" /> Break
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {daySessions.map((session, idx) => (
                          <div 
                            key={session.id}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group ${
                              session.isBreak 
                                ? 'bg-dark-bg border-dark-border text-gray-500' 
                                : 'bg-dark-card border-dark-border shadow-sm hover:shadow-md hover:border-neon-blue/50'
                            }`}
                          >
                            <div className="w-24 flex-shrink-0 text-[11px] font-black text-gray-500 uppercase tracking-tighter">
                              {format(session.startTime, "h:mm a")}
                            </div>
                            <div className="flex-1 flex items-center gap-3">
                              {session.isBreak ? (
                                <Coffee className="w-4 h-4" />
                              ) : (
                                <BookOpen className="w-4 h-4 text-neon-blue" />
                              )}
                              <span className={`font-bold ${session.isBreak ? 'italic' : 'text-white'}`}>
                                {session.subjectName}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-[10px] font-bold text-gray-600">
                                {format(session.endTime, "h:mm a")}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => setEditingSession(session)}
                                  className="p-1.5 text-gray-500 hover:text-neon-blue transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteSession(session.id)}
                                  className="p-1.5 text-gray-500 hover:text-neon-pink transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Edit Session Modal */}
      <AnimatePresence>
        {/* Error Message Modal */}
        {errorMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-neon-pink/20"
            >
              <div className="flex items-center gap-4 mb-6 text-neon-pink">
                <div className="bg-dark-bg p-3 rounded-2xl border border-neon-pink/20">
                  <Plus className="w-8 h-8 rotate-45" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight neon-glow-pink">Error</h3>
              </div>
              <p className="text-gray-400 font-bold mb-8 leading-relaxed">
                {errorMessage}
              </p>
              <button 
                onClick={() => setErrorMessage(null)}
                className="w-full py-4 rounded-2xl bg-neon-pink text-black font-black uppercase tracking-widest hover:bg-neon-pink/80 transition-all shadow-lg shadow-neon-pink/20"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-dark-border"
            >
              <div className="flex items-center gap-4 mb-6 text-neon-pink">
                <div className="bg-dark-bg p-3 rounded-2xl border border-neon-pink/20">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight neon-glow-pink">Reset Plan?</h3>
              </div>
              <p className="text-gray-400 font-bold mb-8 leading-relaxed">
                Are you sure you want to reset? This will clear all subjects, preferences, and your current schedule. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-4 rounded-2xl bg-dark-bg text-gray-500 font-black uppercase tracking-widest hover:bg-dark-border transition-all border border-dark-border"
                >
                  Cancel
                </button>
                <button 
                  onClick={resetPlan}
                  className="flex-1 py-4 rounded-2xl bg-neon-pink text-black font-black uppercase tracking-widest hover:bg-neon-pink/80 transition-all shadow-lg shadow-neon-pink/20"
                >
                  Reset All
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card rounded-3xl p-8 w-full max-w-md shadow-2xl border border-dark-border"
            >
              <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight neon-glow-blue">Edit Session</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-neon-blue uppercase tracking-widest block mb-2">Subject</label>
                  <select 
                    value={editingSession.subjectId}
                    onChange={(e) => {
                      const sub = plan?.subjects.find(s => s.id === e.target.value);
                      setEditingSession({
                        ...editingSession,
                        subjectId: e.target.value,
                        subjectName: e.target.value === "break" ? "Break" : (sub?.name || "Custom"),
                        isBreak: e.target.value === "break"
                      });
                    }}
                    className="w-full p-4 rounded-2xl bg-dark-bg border border-dark-border font-bold text-white focus:ring-2 focus:ring-neon-blue/20 transition-all"
                  >
                    {plan?.subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="break">Break</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-neon-blue uppercase tracking-widest block mb-2">Start Time</label>
                    <input 
                      type="time"
                      step="900"
                      value={format(editingSession.startTime, "HH:mm")}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(":").map(Number);
                        const newStart = setMinutes(setHours(editingSession.startTime, h), m);
                        setEditingSession({ ...editingSession, startTime: newStart });
                      }}
                      className="w-full p-4 rounded-2xl bg-dark-bg border border-dark-border font-bold text-white focus:ring-2 focus:ring-neon-blue/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-neon-blue uppercase tracking-widest block mb-2">End Time</label>
                    <input 
                      type="time"
                      step="900"
                      value={format(editingSession.endTime, "HH:mm")}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(":").map(Number);
                        const newEnd = setMinutes(setHours(editingSession.endTime, h), m);
                        setEditingSession({ ...editingSession, endTime: newEnd });
                      }}
                      className="w-full p-4 rounded-2xl bg-dark-bg border border-dark-border font-bold text-white focus:ring-2 focus:ring-neon-blue/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setEditingSession(null)}
                    className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 bg-dark-bg hover:bg-dark-border transition-all border border-dark-border"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => updateSession(editingSession)}
                    className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-black bg-neon-blue hover:bg-neon-blue/80 shadow-lg shadow-neon-blue/20 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
