export interface Rack {
  id: number;
  name: string;
  status: "online" | "offline";
  soc: number | null;
  soh: number | null;
  charge_status: "Charge" | "Discharge" | "Idle" | null;
  voltage: number | null;
  current: number | null;
  temperature: number | null;
  power_kw: number | null;
  stored_capacity_kwh: number | null;
  remaining_seconds: number | null;
  timestamp: string;
}

export interface CommandHistory {
  command: "CHARGE" | "DISCHARGE";
  mode: "TIMER" | "CONTINUOUS";
  duration?: number;
  remainingSeconds?: number;
  endTime?: Date | null;
  isActive: boolean;
}

export type OperationMode = "TIMER" | "CONTINUOUS";
