/**
 * Parse technician QR payload (demo: JSON string).
 * @param {string} raw
 * @returns {{ ok: boolean, data?: Object, error?: string }}
 */
export function parseQrInstallPayload(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { ok: false, error: 'Empty QR payload' };

  const readUrlParam = (name) => {
    const match = trimmed.match(new RegExp(`[?&]${name}=([^&#]+)`, 'i'));
    return match?.[1] ? decodeURIComponent(match[1]).trim() : '';
  };

  const urlSerial = readUrlParam('serialNumber') || readUrlParam('serial');
  if (urlSerial) {
    return {
      ok: true,
      data: {
        serialNumber: urlSerial,
        qrCode: trimmed
      }
    };
  }

  if (!trimmed.startsWith('{')) {
    const acUnitPart = trimmed
      .split('|')
      .map((part) => part.trim())
      .find((part) => part.toUpperCase().startsWith('AC_UNIT:'));
    const serialNumber = acUnitPart
      ? acUnitPart.slice('AC_UNIT:'.length).trim()
      : trimmed;

    if (!serialNumber) {
      return { ok: false, error: 'Missing serial number in QR payload' };
    }

    return {
      ok: true,
      data: {
        serialNumber,
        qrCode: trimmed
      }
    };
  }

  try {
    const data = JSON.parse(trimmed);
    if (!data.serialNumber && !data.serial) {
      return { ok: false, error: 'Missing serial number in payload' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Invalid QR data (expected JSON)' };
  }
}
