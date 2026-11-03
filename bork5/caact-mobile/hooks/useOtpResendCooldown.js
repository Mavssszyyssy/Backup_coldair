import { useEffect, useState } from "react";

export function useOtpResendCooldown() {
  const [availableAt, setAvailableAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (availableAt <= Date.now()) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [availableAt]);

  const secondsRemaining = Math.max(0, Math.ceil((availableAt - now) / 1000));
  const useServerDeadline = (value, fallbackSeconds = 0) => {
    const parsed = Date.parse(value || "");
    setAvailableAt(Number.isFinite(parsed) && parsed > Date.now()
      ? parsed
      : Date.now() + Math.max(0, Number(fallbackSeconds) || 0) * 1000);
    setNow(Date.now());
  };
  return { secondsRemaining, useServerDeadline };
}
