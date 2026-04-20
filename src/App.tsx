import React, { useState, useCallback } from "react";
import { useRackData } from "./hooks/useRackData";
import { api } from "./services/api";
import type { OperationMode } from "./types";
import "./App.css";

const App: React.FC = () => {
  const { racks, isLoading, error, refresh } = useRackData(5000);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [operationMode, setOperationMode] =
    useState<OperationMode>("CONTINUOUS");
  const [powerKw, setPowerKw] = useState<number>(50);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [activeCommand, setActiveCommand] = useState<{
    isActive: boolean;
    remainingSeconds?: number;
  } | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Tüm rack'lerin charge_status'u ne durumda?
  const allRacksChargeStatus =
    racks.length > 0 ? racks.every((r) => r.charge_status === "Charge") : false;
  const allRacksDischargeStatus =
    racks.length > 0
      ? racks.every((r) => r.charge_status === "Discharge")
      : false;
  const allRacksIdleStatus =
    racks.length > 0 ? racks.every((r) => r.charge_status === "Idle") : false;
  const isMixedStatus =
    !allRacksChargeStatus && !allRacksDischargeStatus && !allRacksIdleStatus;

  // Butonların aktiflik durumu
  const isChargeDisabled =
    isSending ||
    allRacksChargeStatus ||
    (allRacksDischargeStatus && !isMixedStatus);
  const isDischargeDisabled =
    isSending ||
    allRacksDischargeStatus ||
    (allRacksChargeStatus && !isMixedStatus);
  const isIdleDisabled = isSending || allRacksIdleStatus;

  // Timer temizleme
  const clearTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setActiveCommand(null);
  }, [timerInterval]);

  // Idle komutu (timer bitince)
  const sendIdleCommand = useCallback(async () => {
    try {
      await api.sendPowerCommand("Idle", 0, 0);
      setActiveCommand(null);
      refresh();
    } catch (err) {
      console.error("Idle command failed:", err);
    }
  }, [refresh]);

  // Timer başlat
  const startTimer = useCallback(
    (durationMinutes: number) => {
      clearTimer();
      const remainingSeconds = durationMinutes * 60;
      setActiveCommand({ isActive: true, remainingSeconds });

      const interval = setInterval(() => {
        setActiveCommand((prev) => {
          if (!prev || prev.remainingSeconds === undefined) return null;
          const newRemaining = prev.remainingSeconds - 1;
          if (newRemaining <= 0) {
            clearInterval(interval);
            sendIdleCommand();
            return null;
          }
          return { ...prev, remainingSeconds: newRemaining };
        });
      }, 1000);
      setTimerInterval(interval);
    },
    [clearTimer, sendIdleCommand],
  );

  // Power komutu gönder
  const sendPowerCommand = useCallback(
    async (chargeStatus: "Charge" | "Discharge") => {
      setIsSending(true);
      const durationSeconds =
        operationMode === "TIMER" ? durationMinutes * 60 : 31536000; // 1 yıl

      try {
        await api.sendPowerCommand(chargeStatus, powerKw, durationSeconds);

        setMessage({
          type: "success",
          text:
            operationMode === "TIMER"
              ? `Tüm rack'ler ${chargeStatus === "Charge" ? "şarja" : "deşarja"} başladı! ${durationMinutes} dakika sonra otomatik duracak.`
              : `Tüm rack'ler ${chargeStatus === "Charge" ? "şarja" : "deşarja"} başladı! (Sürekli mod)`,
        });

        if (operationMode === "TIMER") {
          startTimer(durationMinutes);
        } else {
          setActiveCommand({ isActive: true });
        }

        setTimeout(() => setMessage(null), 5000);
        setTimeout(() => refresh(), 500);
      } catch (err) {
        console.log(err);
        setMessage({ type: "error", text: "Komut gönderilemedi!" });
        setTimeout(() => setMessage(null), 3000);
      } finally {
        setIsSending(false);
      }
    },
    [operationMode, durationMinutes, powerKw, startTimer, refresh],
  );

  // Acil durdur
  const sendStopCommand = useCallback(async () => {
    setIsSending(true);
    try {
      await api.sendPowerCommand("Idle", 0, 0);
      clearTimer();
      setMessage({ type: "info", text: "Tüm rack'ler durduruldu!" });
      setTimeout(() => setMessage(null), 3000);
      setTimeout(() => refresh(), 500);
    } catch (err) {
      console.log(err);
      setMessage({ type: "error", text: "Durdurma başarısız!" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSending(false);
    }
  }, [clearTimer, refresh]);

  // Format süre
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Rack kartı badge rengi
  const getStatusColor = (status: string) =>
    status === "online" ? "badge-online" : "badge-offline";
  const getChargeStatusClass = (chargeStatus: string | null) => {
    if (chargeStatus === "Charge") return "badge-charge";
    if (chargeStatus === "Discharge") return "badge-discharge";
    return "badge-idle";
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🔋 Battery Rack Controller</h1>
      </div>

      {/* Timer Göstergesi */}
      {activeCommand?.isActive &&
        activeCommand.remainingSeconds !== undefined && (
          <div className="timer-display">
            <div className="time">
              {formatTime(activeCommand.remainingSeconds)}
            </div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>Kalan süre</div>
          </div>
        )}

      <div className="main-layout">
        {/* Rack Grid */}
        <div className="racks-section">
          {isLoading ? (
            <div>Yükleniyor...</div>
          ) : (
            <div className="rack-grid">
              {racks.map((rack) => (
                <div key={rack.id} className="rack-card">
                  <div className="rack-card-header">
                    <span className="rack-name">{rack.name}</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span
                        className={`badge ${getStatusColor(rack.status || "offline")}`}
                      >
                        {rack.status || "offline"}
                      </span>
                      <span
                        className={`badge ${getChargeStatusClass(rack.charge_status)}`}
                      >
                        {rack.charge_status || "Idle"}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                  >
                    <span className="badge badge-blue">
                      SoC: {rack.soc ?? "N/A"}%
                    </span>
                  </div>
                  <div className="rack-details">
                    <div className="rack-detail-item">
                      <span>🔋 Voltage:</span>
                      <strong>{rack.voltage ?? "N/A"} mV</strong>
                    </div>
                    <div className="rack-detail-item">
                      <span>⚡ Current:</span>
                      <strong>{rack.current ?? "N/A"} A</strong>
                    </div>
                    <div className="rack-detail-item">
                      <span>💪 Power:</span>
                      <strong>{rack.power_kw ?? "N/A"} kW</strong>
                    </div>
                    <div className="rack-detail-item">
                      <span>🌡️ Temp:</span>
                      <strong>{rack.temperature ?? "N/A"} °C</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="control-section">
          <h3 className="section-title">🎮 Kontrol Paneli</h3>

          {/* Çalışma Modu */}
          <div className="form-group">
            <label>🎯 Çalışma Modu</label>
            <div className="radio-group">
              <div
                className={`radio-option ${operationMode === "TIMER" ? "active" : ""}`}
                onClick={() => !isSending && setOperationMode("TIMER")}
                style={{
                  cursor: isSending ? "not-allowed" : "pointer",
                  opacity: isSending ? 0.5 : 1,
                }}
              >
                ⏱️ Timer Modu
              </div>
              <div
                className={`radio-option ${operationMode === "CONTINUOUS" ? "active" : ""}`}
                onClick={() => !isSending && setOperationMode("CONTINUOUS")}
                style={{
                  cursor: isSending ? "not-allowed" : "pointer",
                  opacity: isSending ? 0.5 : 1,
                }}
              >
                🔄 Sürekli Mod
              </div>
            </div>
          </div>

          {/* Timer Süresi */}
          {operationMode === "TIMER" && (
            <div className="form-group">
              <label>⏱️ Süre (Dakika)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min={1}
                max={480}
                step={5}
                disabled={isSending}
              />
              <small>Süre dolduğunda otomatik Idle'a geçer.</small>
            </div>
          )}

          {/* Güç Ayarları */}
          <div className="form-group">
            <label>⚡ Güç (kW)</label>
            <input
              type="number"
              value={powerKw}
              onChange={(e) => setPowerKw(Number(e.target.value))}
              min={0}
              max={500}
              step={10}
              disabled={isSending}
            />
          </div>

          {/* Butonlar */}
          <div className="form-group">
            <label>🔘 Kontrol</label>
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={() => sendPowerCommand("Charge")}
                disabled={isChargeDisabled}
              >
                🔋 ŞARJ
              </button>
              <button
                className="btn btn-warning"
                onClick={() => sendPowerCommand("Discharge")}
                disabled={isDischargeDisabled}
              >
                ⚡ DEŞARJ
              </button>
              <button
                className="btn btn-danger"
                onClick={sendStopCommand}
                disabled={isIdleDisabled}
              >
                🛑 DURDUR
              </button>
            </div>
          </div>

          {/* Mesaj */}
          {message && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          {/* Bilgi */}
          <div className="info-box">
            💡{" "}
            {operationMode === "TIMER"
              ? "Timer modunda süre dolunca otomatik Idle."
              : "Sürekli modda DURDUR butonu ile durdur."}
            {isMixedStatus && " ⚠️ Rack'ler farklı durumlarda!"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
