export interface FrameFixingChecklist {
  fastenerFixing: boolean;
  frameLockAreaFinish: boolean;
  outsideArchitraveFixing: boolean;
  insideArchitraveFixing: boolean;
  doneBy: string;
  timestamp: string; // ISO string or empty
}

export interface DoorFixingChecklist {
  shutterEdgeFinishing: boolean;
  gapBetweenFrameAndShutter: boolean;
  iSealFixing: boolean;
  visionGlassBeatFinishing: boolean;
  doneBy: string;
  timestamp: string;
}

export interface HardwareFixingChecklist {
  hingeFitting: boolean;
  lockWithHandleFitting: boolean;
  eyeviewInstallation: boolean;
  towerBoltInstallation: boolean;
  doorCloserInstallation: boolean;
  autoDropSealInstallation: boolean;
  doneBy: string;
  timestamp: string;
}

export interface HandoverChecklist {
  frameCarpatchFillingSanding: boolean;
  frameTouchUp: boolean;
  shutterEdgeFinishing: boolean;
  lockSlotAreaFinishing: boolean;
  shutterTouchUp: boolean;
  hardwareCleaning: boolean;
  plasticCoverRemoval: boolean;
  keysHandover: boolean;
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
