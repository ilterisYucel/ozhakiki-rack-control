import axios from "axios";
import type { Rack, SystemDataPoint } from "../types";

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

  getSystemHistoricalData: async (
    limit: number = 200,
  ): Promise<SystemDataPoint[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/api/racks/history?limit=${limit}`,
    );
    const history = response.data.history || [];

    const systemData: SystemDataPoint[] = [];

    history.forEach((snapshot: Rack[]) => {
      if (snapshot.length === 0) return;

      // İlk rack'in verilerini kullan (hepsi aynı)
      const firstRack = snapshot[0];

      let currentValue = null;
      // Sistem akımı = rack akımı × 8
      currentValue = (firstRack.current ?? 0) * 8;

      systemData.push({
        timestamp: firstRack.timestamp,
        voltage: firstRack.voltage ?? 0,
        current: currentValue,
      });
    });

    // Timestamp'e göre sırala
    return systemData.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  },
};
