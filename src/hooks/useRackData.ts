import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import type { Rack } from "../types";

export const useRackData = (autoRefreshInterval: number = 5000) => {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const loadRacks = useCallback(async () => {
    try {
      const data = await api.getRacks();
      setRacks(data);
      setError(null);
    } catch (err) {
      setError("Rackler yüklenemedi!");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto refresh
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRacks();
    intervalRef.current = setInterval(loadRacks, autoRefreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadRacks, autoRefreshInterval]);

  return { racks, isLoading, error, refresh: loadRacks };
};
