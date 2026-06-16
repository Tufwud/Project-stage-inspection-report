import { MilestoneKey, MILESTONES } from '../types';
import { getProjectAnalysis } from '../utils';
import { Building2, ClipboardCheck, Clock, CheckCircle, Flame, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface OverviewStatsProps {
  analysis: ReturnType<typeof getProjectAnalysis>;
  onSelectMilestone: (key: MilestoneKey | null) => void;
  selectedMilestone: MilestoneKey | null;
}

export default function OverviewStats({ analysis, onSelectMilestone, selectedMilestone }: OverviewStatsProps) {
  const {
    totalFlats,
    overallProgress,
    completedFlatsCount,
    inProgressFlatsCount,
    notStartedFlatsCount,
    stageAverages,
  } = analysis;

  const cards = [
    {
      label: "Total Unique Openings",
      value: totalFlats,
      sub: "Doors Tracked Across Towers",
      icon: Building2,
      color: "text-zinc-500 bg-zinc-50 border-zinc-200",
    },
    {
      label: "Overall Progress Index",
      value: `${overallProgress}%`,
      sub: "Average Checkpoint Success",
      icon: Target,
      color: "text-emerald-500 bg-emerald-50/50 border-emerald-100",
    },
    {
      label: "Fully Handed Over",
      value: completedFlatsCount,
      sub: "100% Steps Complete",
      icon: CheckCircle,
      color: "text-blue-500 bg-blue-50/50 border-blue-100",
    },
    {
      label: "Work-In-Progress",
      value: inProgressFlatsCount,
      sub: "Active Installation Stage",
      icon: Clock,
      color: "text-amber-500 bg-amber-50/50 border-amber-100",
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              key={card.label}
              className={`p-5 rounded-2xl border bg-white shadow-sm flex items-start justify-between`}
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  {card.label}
                </span>
                <div className="text-3xl font-bold tracking-tight text-zinc-900">
                  {card.value}
                </div>
                <div className="text-xs text-zinc-500 font-medium">
                  {card.sub}
                </div>
              </div>
              <div className={`p-3 rounded-xl border ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Stage-by-Stage / Milestones Breakdown Interactivity */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-zinc-100 gap-4">
          <div>
            <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Stage Completion & Milestones</h3>
            <p className="text-sm text-zinc-500 font-medium">Click on a stage below to isolate checkmarks and identify bottlenecks.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedMilestone && (
              <button
                onClick={() => onSelectMilestone(null)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200"
              >
                Clear Stage Filter
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MILESTONES.map((milestone) => {
            const isSelected = selectedMilestone === milestone.key;
            const avg = stageAverages[milestone.key as keyof typeof stageAverages] || 0;
            
            // Color map for stages
            const colors = {
              frameFixing: { border: "border-indigo-100", activeBg: "bg-indigo-50 border-indigo-400 text-indigo-950", bar: "bg-indigo-600", dot: "text-indigo-600" },
              doorFixing: { border: "border-sky-100", activeBg: "bg-sky-50 border-sky-400 text-sky-950", bar: "bg-sky-600", dot: "text-sky-600" },
              hardwareFixing: { border: "border-amber-100", activeBg: "bg-amber-50 border-amber-400 text-amber-950", bar: "bg-amber-600", dot: "text-amber-500" },
              handover: { border: "border-emerald-100", activeBg: "bg-emerald-50 border-emerald-400 text-emerald-950", bar: "bg-emerald-600", dot: "text-emerald-500" },
            }[milestone.key];

            return (
              <button
                key={milestone.key}
                onClick={() => onSelectMilestone(isSelected ? null : milestone.key)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden group hover:shadow-md ${
                  isSelected 
                    ? colors.activeBg 
                    : "border-zinc-200 bg-white hover:border-zinc-300 text-zinc-800 hover:bg-zinc-50/50"
                }`}
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${isSelected ? colors.bar : "bg-transparent group-hover:bg-zinc-200 transition"}`}></div>

                <div className="pl-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold tracking-tight text-sm">
                      {milestone.label}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-zinc-100 text-zinc-600'}`}>
                      {milestone.totalSubtasks} tasks
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-medium font-mono">
                      <span>Completed</span>
                      <span className="font-bold text-zinc-900">{avg}%</span>
                    </div>
                    
                    {/* Progress Bar Container */}
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${avg}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-medium pt-1 text-zinc-400 group-hover:text-zinc-600 transition">
                    <span>{isSelected ? "● Filter Active" : "Click to view subtask rates"}</span>
                    <span>→</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
