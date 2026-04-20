import axios from "axios";
import type { Rack } from "../types";

const API_BASE_URL = "http://16.171.8.238:8016";

export const api = {
  // Rack'leri getir
  getRacks: async (): Promise<Rack[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/racks/latest`);
    return response.data.racks || [];
  },

  // Power komutu gönder (Charge/Discharge/Idle)
  sendPowerCommand: async (
    chargeStatus: "Charge" | "Discharge" | "Idle",
    powerKw: number,
    durationSeconds: number,
  ): Promise<void> => {
    await axios.post(`${API_BASE_URL}/api/commands/power`, {
      charge_status: chargeStatus,
      power_kw: powerKw,
      duration_seconds: durationSeconds,
    });
  },
};
