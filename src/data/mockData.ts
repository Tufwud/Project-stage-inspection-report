import { FlatRecord } from '../types';

export const DEFAULT_FLATS: FlatRecord[] = [
  {
    id: "REC-001",
    oaNo: "OA-2026-9041",
    towerId: "Tower 01",
    flatsPerFloor: 4,
    floor: 1,
    flatNo: "101",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Rajesh Kumar",
      timestamp: "2026-05-12T09:30:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Rajesh Kumar",
      timestamp: "2026-05-14T11:00:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: true,
      autoDropSealInstallation: true,
      doneBy: "Karan Singh",
      timestamp: "2026-05-16T15:30:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: true,
      frameTouchUp: true,
      shutterEdgeFinishing: true,
      lockSlotAreaFinishing: true,
      shutterTouchUp: true,
      hardwareCleaning: true,
      plasticCoverRemoval: true,
      keysHandover: true,
      timestamp: "2026-05-18T16:00:00Z"
    }
  },
  {
    id: "REC-002",
    oaNo: "OA-2026-9041",
    towerId: "Tower 01",
    flatsPerFloor: 4,
    floor: 1,
    flatNo: "102",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Rajesh Kumar",
      timestamp: "2026-05-12T10:45:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Rajesh Kumar",
      timestamp: "2026-05-14T14:15:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: true,
      autoDropSealInstallation: false,
      doneBy: "Karan Singh",
      timestamp: "2026-05-16T17:10:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-003",
    oaNo: "OA-2026-9041",
    towerId: "Tower 01",
    flatsPerFloor: 4,
    floor: 1,
    flatNo: "103",
    doorName: "Bedroom-01 Fire Door",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: false,
      doneBy: "Amit Roy",
      timestamp: "2026-05-13T09:15:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: false,
      visionGlassBeatFinishing: false,
      doneBy: "",
      timestamp: ""
    },
    hardwareFixing: {
      hingeFitting: false,
      lockWithHandleFitting: false,
      eyeviewInstallation: false,
      towerBoltInstallation: false,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "",
      timestamp: ""
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-004",
    oaNo: "OA-2026-9042",
    towerId: "Tower 01",
    flatsPerFloor: 4,
    floor: 2,
    flatNo: "201",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Rajesh Kumar",
      timestamp: "2026-05-20T10:00:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Rajesh Kumar",
      timestamp: "2026-05-22T11:30:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: true,
      autoDropSealInstallation: true,
      doneBy: "Karan Singh",
      timestamp: "2026-05-25T14:00:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: true,
      frameTouchUp: true,
      shutterEdgeFinishing: true,
      lockSlotAreaFinishing: true,
      shutterTouchUp: true,
      hardwareCleaning: true,
      plasticCoverRemoval: true,
      keysHandover: true,
      timestamp: "2026-05-28T16:45:00Z"
    }
  },
  {
    id: "REC-005",
    oaNo: "OA-2026-9042",
    towerId: "Tower 01",
    flatsPerFloor: 4,
    floor: 2,
    flatNo: "202",
    doorName: "Balcony Sliding Door",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: false,
      insideArchitraveFixing: false,
      doneBy: "Amit Roy",
      timestamp: "2026-05-20T14:30:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: false,
      gapBetweenFrameAndShutter: false,
      iSealFixing: false,
      visionGlassBeatFinishing: false,
      doneBy: "",
      timestamp: ""
    },
    hardwareFixing: {
      hingeFitting: false,
      lockWithHandleFitting: false,
      eyeviewInstallation: false,
      towerBoltInstallation: false,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "",
      timestamp: ""
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-006",
    oaNo: "OA-2026-9045",
    towerId: "Tower 02",
    flatsPerFloor: 6,
    floor: 1,
    flatNo: "101",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Sanjay Dutta",
      timestamp: "2026-05-15T09:00:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Sanjay Dutta",
      timestamp: "2026-05-17T10:30:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: true,
      autoDropSealInstallation: true,
      doneBy: "Madan Lal",
      timestamp: "2026-05-20T12:00:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: true,
      frameTouchUp: true,
      shutterEdgeFinishing: true,
      lockSlotAreaFinishing: true,
      shutterTouchUp: true,
      hardwareCleaning: true,
      plasticCoverRemoval: true,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-007",
    oaNo: "OA-2026-9045",
    towerId: "Tower 02",
    flatsPerFloor: 6,
    floor: 1,
    flatNo: "102",
    doorName: "Toilet / Utility Door",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Sanjay Dutta",
      timestamp: "2026-05-15T10:45:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Sanjay Dutta",
      timestamp: "2026-05-17T14:00:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "Madan Lal",
      timestamp: "2026-05-21T11:15:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-008",
    oaNo: "OA-2026-9045",
    towerId: "Tower 02",
    flatsPerFloor: 6,
    floor: 1,
    flatNo: "103",
    doorName: "Bedroom-01 Fire Door",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Sanjay Dutta",
      timestamp: "2026-05-16T11:15:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: false,
      doneBy: "Sanjay Dutta",
      timestamp: "2026-05-18T15:30:00Z"
    },
    hardwareFixing: {
      hingeFitting: false,
      lockWithHandleFitting: false,
      eyeviewInstallation: false,
      towerBoltInstallation: false,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "",
      timestamp: ""
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-009",
    oaNo: "OA-2026-9046",
    towerId: "Tower 02",
    flatsPerFloor: 6,
    floor: 2,
    flatNo: "201",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-22T09:30:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-24T11:00:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: true,
      autoDropSealInstallation: true,
      doneBy: "Karan Singh",
      timestamp: "2026-05-27T10:00:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: true,
      frameTouchUp: true,
      shutterEdgeFinishing: true,
      lockSlotAreaFinishing: true,
      shutterTouchUp: true,
      hardwareCleaning: true,
      plasticCoverRemoval: true,
      keysHandover: true,
      timestamp: "2026-05-30T15:00:00Z"
    }
  },
  {
    id: "REC-010",
    oaNo: "OA-2026-9046",
    towerId: "Tower 02",
    flatsPerFloor: 6,
    floor: 2,
    flatNo: "202",
    doorName: "Bedroom-01 Fire Door",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-22T13:45:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-25T09:00:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: true,
      autoDropSealInstallation: true,
      doneBy: "Karan Singh",
      timestamp: "2026-05-27T13:40:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: true,
      frameTouchUp: true,
      shutterEdgeFinishing: true,
      lockSlotAreaFinishing: true,
      shutterTouchUp: true,
      hardwareCleaning: true,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-011",
    oaNo: "OA-2026-9050",
    towerId: "Tower 03",
    flatsPerFloor: 4,
    floor: 1,
    flatNo: "101",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Amit Roy",
      timestamp: "2026-05-18T14:00:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: false,
      gapBetweenFrameAndShutter: false,
      iSealFixing: false,
      visionGlassBeatFinishing: false,
      doneBy: "",
      timestamp: ""
    },
    hardwareFixing: {
      hingeFitting: false,
      lockWithHandleFitting: false,
      eyeviewInstallation: false,
      towerBoltInstallation: false,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "",
      timestamp: ""
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-012",
    oaNo: "OA-2026-9050",
    towerId: "Tower 03",
    flatsPerFloor: 4,
    floor: 1,
    flatNo: "102",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: false,
      insideArchitraveFixing: false,
      doneBy: "Amit Roy",
      timestamp: "2026-05-18T15:30:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: false,
      gapBetweenFrameAndShutter: false,
      iSealFixing: false,
      visionGlassBeatFinishing: false,
      doneBy: "",
      timestamp: ""
    },
    hardwareFixing: {
      hingeFitting: false,
      lockWithHandleFitting: false,
      eyeviewInstallation: false,
      towerBoltInstallation: false,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "",
      timestamp: ""
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-013",
    oaNo: "OA-2026-9051",
    towerId: "Tower 03",
    flatsPerFloor: 4,
    floor: 2,
    flatNo: "201",
    doorName: "Bedroom-01 Fire Door",
    frameFixing: {
      fastenerFixing: false,
      frameLockAreaFinish: false,
      outsideArchitraveFixing: false,
      insideArchitraveFixing: false,
      doneBy: "",
      timestamp: ""
    },
    doorFixing: {
      shutterEdgeFinishing: false,
      gapBetweenFrameAndShutter: false,
      iSealFixing: false,
      visionGlassBeatFinishing: false,
      doneBy: "",
      timestamp: ""
    },
    hardwareFixing: {
      hingeFitting: false,
      lockWithHandleFitting: false,
      eyeviewInstallation: false,
      towerBoltInstallation: false,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "",
      timestamp: ""
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  },
  {
    id: "REC-014",
    oaNo: "OA-2026-9055",
    towerId: "Tower 04",
    flatsPerFloor: 4,
    floor: 1,
    flatNo: "101",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-29T10:00:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-31T11:00:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: true,
      autoDropSealInstallation: true,
      doneBy: "Madan Lal",
      timestamp: "2026-06-02T15:30:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: true,
      frameTouchUp: true,
      shutterEdgeFinishing: true,
      lockSlotAreaFinishing: true,
      shutterTouchUp: true,
      hardwareCleaning: true,
      plasticCoverRemoval: true,
      keysHandover: true,
      timestamp: "2026-06-05T14:45:00Z"
    }
  },
  {
    id: "REC-015",
    oaNo: "OA-2026-9055",
    towerId: "Tower 04",
    flatsPerFloor: 4,
    floor: 1,
    flatNo: "102",
    doorName: "Main Entrance (Teak Wood)",
    frameFixing: {
      fastenerFixing: true,
      frameLockAreaFinish: true,
      outsideArchitraveFixing: true,
      insideArchitraveFixing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-29T11:30:00Z"
    },
    doorFixing: {
      shutterEdgeFinishing: true,
      gapBetweenFrameAndShutter: true,
      iSealFixing: true,
      visionGlassBeatFinishing: true,
      doneBy: "Vijay M.",
      timestamp: "2026-05-31T14:30:00Z"
    },
    hardwareFixing: {
      hingeFitting: true,
      lockWithHandleFitting: true,
      eyeviewInstallation: true,
      towerBoltInstallation: true,
      doorCloserInstallation: false,
      autoDropSealInstallation: false,
      doneBy: "Madan Lal",
      timestamp: "2026-06-03T11:00:00Z"
    },
    handover: {
      frameCarpatchFillingSanding: false,
      frameTouchUp: false,
      shutterEdgeFinishing: false,
      lockSlotAreaFinishing: false,
      shutterTouchUp: false,
      hardwareCleaning: false,
      plasticCoverRemoval: false,
      keysHandover: false,
      timestamp: ""
    }
  }
];

export const SUPERVISORS = [
  "Aarif Taslim",
  "Vivek Laxman",
  "Sandip Vishwakarma",
  "Nagesh Yadav",
  "Surya Pratap Singh",
  "Radheshyam",
  "Rahul Sharma",
  "Ramanpreet Singh",
  "Arunava Samadder",
  "Niranjan Das",
  "Indraj Meghwal"
];

export const TOWERS_LIST = [
  "Tower 01",
  "Tower 02",
  "Tower 03",
  "Tower 04"
];

export const DOOR_MAP: { [key: string]: string } = {
  "A": "Main Door (MD)",
  "B": "Bedroom 1 (BR1)",
  "C": "Bedroom 2 (BR2)",
  "D": "Toilet 1 (T1)",
  "E": "Toilet 2 (T2)",
  "F": "Balcony"
};

export const DOOR_TYPES = [
  "Main Door (MD)",
  "Bedroom 1 (BR1)",
  "Bedroom 2 (BR2)",
  "Toilet 1 (T1)",
  "Toilet 2 (T2)",
  "Balcony",
  "Main Entrance (Teak Wood)",
  "Bedroom-01 Fire Door",
  "Bedroom-02 HDF Shutter",
  "Toilet / Utility Door",
  "Balcony Sliding Door"
];
