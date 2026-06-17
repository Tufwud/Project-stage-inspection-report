export type QualitativeState = 
  | 'not_started' 
  | 'completed' 
  | 'approved' 
  | 'approved_remarks' 
  | 'repair_reqd' 
  | 'rework_needed' 
  | 'not_approved' 
  | 'rejected' 
  | 'handed_over';

export interface QualitativeChoice {
  key: QualitativeState;
  label: string;
  weight: number;
  color: string;
}

export const QUALITATIVE_CHOICES: { [key in QualitativeState]: QualitativeChoice } = {
  not_started: { 
    key: 'not_started', 
    label: "Not Started", 
    weight: 0.0, 
    color: "bg-zinc-100 text-zinc-650 border-zinc-200" 
  },
  completed: { 
    key: 'completed', 
    label: "Completed (The work is ready for inspection)", 
    weight: 0.5, 
    color: "bg-blue-50 text-blue-700 border-blue-200" 
  },
  approved: { 
    key: 'approved', 
    label: "Approved (Fully satisfactory outcome)", 
    weight: 1.0, 
    color: "bg-emerald-50 text-emerald-800 border-emerald-250" 
  },
  approved_remarks: { 
    key: 'approved_remarks', 
    label: "Approved with Remarks (Satisfactory, but with notes)", 
    weight: 0.8, 
    color: "bg-teal-50 text-teal-700 border-teal-200" 
  },
  repair_reqd: { 
    key: 'repair_reqd', 
    label: "Repair Reqd. (Requires minor corrective work)", 
    weight: 0.6, 
    color: "bg-amber-50 text-amber-700 border-amber-200" 
  },
  rework_needed: { 
    key: 'rework_needed', 
    label: "Rework Needed (Requires significant corrective work)", 
    weight: 0.5, 
    color: "bg-orange-50 text-orange-700 border-orange-200" 
  },
  not_approved: { 
    key: 'not_approved', 
    label: "Not Approved- Remarks (Failed inspection, with specific notes)", 
    weight: 0.0, 
    color: "bg-rose-50 text-rose-700 border-rose-200" 
  },
  rejected: { 
    key: 'rejected', 
    label: "Rejected- Debit Contractor (Unacceptable outcome, leading to a financial penalty)", 
    weight: -0.5, 
    color: "bg-rose-100 text-rose-800 border-rose-305" 
  },
  handed_over: { 
    key: 'handed_over', 
    label: "Handed OVER to client", 
    weight: 1.0, 
    color: "bg-indigo-50 text-indigo-750 border-indigo-200" 
  }
};

export interface FrameFixingChecklist {
  fastenerFixing: boolean | QualitativeState;
  frameLockAreaFinish: boolean | QualitativeState;
  outsideArchitraveFixing: boolean | QualitativeState;
  insideArchitraveFixing: boolean | QualitativeState;
  doneBy: string;
  timestamp: string; // ISO string or empty
}

export interface DoorFixingChecklist {
  shutterEdgeFinishing: boolean | QualitativeState;
  gapBetweenFrameAndShutter: boolean | QualitativeState;
  iSealFixing: boolean | QualitativeState;
  visionGlassBeatFinishing: boolean | QualitativeState;
  doneBy: string;
  timestamp: string;
}

export interface HardwareFixingChecklist {
  hingeFitting: boolean | QualitativeState;
  lockWithHandleFitting: boolean | QualitativeState;
  eyeviewInstallation: boolean | QualitativeState;
  towerBoltInstallation: boolean | QualitativeState;
  doorCloserInstallation: boolean | QualitativeState;
  autoDropSealInstallation: boolean | QualitativeState;
  doneBy: string;
  timestamp: string;
}

export interface HandoverChecklist {
  frameCarpatchFillingSanding: boolean | QualitativeState;
  frameTouchUp: boolean | QualitativeState;
  shutterEdgeFinishing: boolean | QualitativeState;
  lockSlotAreaFinishing: boolean | QualitativeState;
  shutterTouchUp: boolean | QualitativeState;
  hardwareCleaning: boolean | QualitativeState;
  plasticCoverRemoval: boolean | QualitativeState;
  keysHandover: boolean | QualitativeState;
  timestamp: string;
}

export interface FlatRecord {
  id: string; // ID from data
  oaNo: string; // OA No
  towerId: string; // Tower ID (e.g., T-01, T-02)
  flatsPerFloor: number; // Flats/Floor
  floor: number; // Floor (e.g., 1, 2, 3...)
  flatNo: string; // Flat No (e.g., 101, 102...)
  doorName: string; // Door Name (e.g., Main Door, Bedroom, Toilet)
  price?: number; // Base contract price/budget for this opening. Defaults to 5000 if not specified.
  
  // Stages
  frameFixing: FrameFixingChecklist;
  doorFixing: DoorFixingChecklist;
  hardwareFixing: HardwareFixingChecklist;
  handover: HandoverChecklist;
}

export type MilestoneKey = 'frameFixing' | 'doorFixing' | 'hardwareFixing' | 'handover';

export interface MilestoneMeta {
  key: MilestoneKey;
  label: string;
  totalSubtasks: number;
  subtaskLabels: { [key: string]: string };
}

export const MILESTONES: MilestoneMeta[] = [
  {
    key: 'frameFixing',
    label: 'Frame Fixing',
    totalSubtasks: 4,
    subtaskLabels: {
      fastenerFixing: 'Fastener fixing',
      frameLockAreaFinish: 'Frame lock area finish',
      outsideArchitraveFixing: 'Outside architrave fixing',
      insideArchitraveFixing: 'Inside architrave fixing',
    }
  },
  {
    key: 'doorFixing',
    label: 'Door Fixing',
    totalSubtasks: 4,
    subtaskLabels: {
      shutterEdgeFinishing: 'Shutter edge finishing',
      gapBetweenFrameAndShutter: 'Gap between frame and shutter',
      iSealFixing: 'I seal fixing',
      visionGlassBeatFinishing: 'Vision glass beat finishing',
    }
  },
  {
    key: 'hardwareFixing',
    label: 'Hardware Fixing',
    totalSubtasks: 6,
    subtaskLabels: {
      hingeFitting: 'Hinge fitting',
      lockWithHandleFitting: 'Lock with handle fitting',
      eyeviewInstallation: 'Eyeview installation',
      towerBoltInstallation: 'Tower bolt installation',
      doorCloserInstallation: 'Door closer installation',
      autoDropSealInstallation: 'Auto drop seal installation',
    }
  },
  {
    key: 'handover',
    label: 'Handover',
    totalSubtasks: 8,
    subtaskLabels: {
      frameCarpatchFillingSanding: 'Frame carpatch filling & sanding',
      frameTouchUp: 'Frame Touch-up',
      shutterEdgeFinishing: 'Shutter edge finishing',
      lockSlotAreaFinishing: 'Lock slot area finishing',
      shutterTouchUp: 'Shutter Touch-up',
      hardwareCleaning: 'Hardware cleaning',
      plasticCoverRemoval: 'Plastic cover removal',
      keysHandover: 'Keys handover',
    }
  }
];
