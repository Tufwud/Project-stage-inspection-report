import { MilestoneKey, MILESTONES } from '../types';
import { getProjectAnalysis } from '../utils';
import { CheckCircle2, ChevronRight, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

interface MilestoneBreakdownProps {
  analysis: ReturnType<typeof getProjectAnalysis>;
  selectedMilestone: MilestoneKey | null;
  onSelectMilestone: (key: MilestoneKey) => void;
}

export default function MilestoneBreakdown({ analysis, selectedMilestone, onSelectMilestone }: MilestoneBreakdownProps) {
  const { subtaskAnalysis } = analysis;

  // Filter subtasks based on selected milestone
  const displayedSubtasks = selectedMilestone
    ? subtaskAnalysis.filter(sub => sub.milestone === MILESTONES.find(m => m.key === selectedMilestone)?.label)
    : subtaskAnalysis;

  // Critical bottlenecks are subtasks with less than 60% completion (where the total count is > 0)
  const bottlenecks = subtaskAnalysis
    .filter(sub => sub.completedPercentage < 65)
    .sort((a, b) => a.completedPercentage - b.completedPercentage)
    .slice(0, 3);

  // Completed items are subtasks with 100% completion or highest
  const leaders = subtaskAnalysis
    .filter(sub => sub.completedPercentage >= 80)
    .sort((a, b) => b.completedPercentage - a.completedPercentage)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visual Bar Lists */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h3 className="font-bold text-lg text-zinc-900 tracking-tight">
              {selectedMilestone 
                ? `${MILESTONES.find(m => m.key === selectedMilestone)?.label} Detailed Checklist Progress` 
                : "Continuous Quality Checkpoint Progress across all milestones"}
            </h3>
            <p className="text-sm text-zinc-500 font-medium font-sans">
              Percentage of doors that have successfully passed inspection for each unique stage requirement.
            </p>
          </div>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
            {displayedSubtasks.map((sub) => {
              // Accent coloring depending on percentage
              let progressColor = "bg-rose-500";
              let textColor = "text-rose-700 bg-rose-50 border-rose-100";
              
              if (sub.completedPercentage >= 80) {
                progressColor = "bg-emerald-500";
                textColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
              } else if (sub.completedPercentage >= 50) {
                progressColor = "bg-blue-500";
                textColor = "text-blue-700 bg-blue-50 border-blue-100";
              }

              return (
                <div key={sub.key + sub.milestone} className="space-y-1 bg-zinc-50/50 hover:bg-zinc-50 p-3 rounded-xl border border-zinc-100 transition">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 font-medium">{sub.label}</span>
                      {!selectedMilestone && (
                        <span className="text-[10px] font-normal uppercase tracking-wide text-zinc-400 font-mono bg-zinc-200 px-1.5 rounded">
                          {sub.milestone}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono ${textColor}`}>
                      {sub.completedPercentage}% Pass
                    </span>
                  </div>
                  
                  <div className="relative pt-1">
                    <div className="h-2 w-full bg-zinc-200/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${sub.completedPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedMilestone && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <button
              onClick={() => {
                const currentIndex = MILESTONES.findIndex(m => m.key === selectedMilestone);
                const nextIndex = (currentIndex + 1) % MILESTONES.length;
                onSelectMilestone(MILESTONES[nextIndex].key);
              }}
              className="w-full text-center py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg"
            >
              Examine Next Stage Checklist
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Analytics Insights Sidebar */}
      <div className="space-y-6">
        {/* Critical Bottlenecks alerts */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-900 tracking-tight text-sm">Critical Delivery Bottlenecks</h3>
          </div>

          {bottlenecks.length === 0 ? (
            <p className="text-xs text-zinc-500 font-medium">All checkpoints are currently operating above critical limits (65%+).</p>
          ) : (
            <div className="space-y-3">
              {bottlenecks.map(b => (
                <div key={b.key} className="flex gap-3 items-start border-l-2 border-orange-400 pl-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-900 leading-snug">{b.label}</p>
                    <p className="text-[11px] text-zinc-400 font-medium uppercase font-mono">{b.milestone}</p>
                    <div className="flex items-center gap-1 text-[11px] text-orange-600 font-semibold font-mono">
                      <span>Completion level:</span>
                      <span>{b.completedPercentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performer Milestones */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-900 tracking-tight text-sm">Milestone Leaders</h3>
          </div>

          {leaders.length === 0 ? (
            <p className="text-xs text-zinc-500 font-medium">No checkpoints have reached the 80% mark yet.</p>
          ) : (
            <div className="space-y-3">
              {leaders.map(l => (
                <div key={l.key} className="flex gap-3 items-start border-l-2 border-emerald-400 pl-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-900 leading-snug">{l.label}</p>
                    <p className="text-[11px] text-zinc-400 font-medium uppercase font-mono">{l.milestone}</p>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold font-mono">
                      <span>Completion level:</span>
                      <span>{l.completedPercentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendation card */}
        <div className="bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-widest leading-none">Smart Recommendation</h4>
          </div>
          <p className="text-xs text-indigo-900/80 font-medium leading-relaxed">
            {bottlenecks.length > 0
              ? `Prioritize staff scheduling on ${bottlenecks[0].label} in the next work cycle. Completing this step will free the downstream Handover tasks.`
              : "All workflows are progressing uniformly. Prepare keys checklists for next week's handovers."}
          </p>
        </div>
      </div>
    </div>
  );
}
