import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import type { SystemDataPoint } from "../types";

export const useSystemHistoricalData = (refreshInterval: number = 10000) => {
  const [systemData, setSystemData] = useState<SystemDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const loadSystemData = useCallback(async () => {
    try {
      const data = await api.getSystemHistoricalData(200);
      setSystemData(data);
    } catch (err) {
      console.error("Error loading system historical data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSystemData();
    intervalRef.current = setInterval(loadSystemData, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadSystemData, refreshInterval]);

  return { systemData, isLoading, refresh: loadSystemData };
};
