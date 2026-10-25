import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { RiNotification3Line, RiShareForwardLine } from 'react-icons/ri';
import { fetchAlarmPreferences, updateAlarmPreferences } from '../api/alarmApi';
import useWebPush from '../hooks/useWebPush';

const DEFAULT_PREFS = {
  missingRecordEnabled: false,
  missingRecordTime: '22:00',
  assignConfirmEnabled: false,
  applyDeadlineEnabled: false,
  applyDeadlineFriTime: '22:00',
  applyDeadlineSatTime: '22:00',
  applyDeadlineSunTime: '12:00',
};

const normalizeTime = (value, fallback) => {
  if (!value || typeof value !== 'string') return fallback;
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return fallback;
  const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, '0');
  return `${hh}:${mm}`;
};

const anyEnabled = (p) =>
  !!(p?.missingRecordEnabled || p?.assignConfirmEnabled || p?.applyDeadlineEnabled);

/** 마스터 ON/OFF → API 세 타입 일괄 */
const withMaster = (base, enabled) => ({
  ...base,
  missingRecordEnabled: enabled,
  assignConfirmEnabled: enabled,
  applyDeadlineEnabled: enabled,
});

const AlarmSettingsCard = () => {
  const {
    supported,
    permission,
    subscribed,
    busy: pushBusy,
    error: pushError,
    setError: setPushError,
    iosNeedsInstall,
    connectThisDevice,
    disconnectThisDevice,
    disconnectAllDevices,
  } = useWebPush();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const alarmsOn = anyEnabled(prefs);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    const res = await fetchAlarmPreferences();
    if (res.success && res.data) {
      const loaded = {
        missingRecordEnabled: !!res.data.missingRecordEnabled,
        missingRecordTime: normalizeTime(res.data.missingRecordTime, '22:00'),
        assignConfirmEnabled: !!res.data.assignConfirmEnabled,
        applyDeadlineEnabled: !!res.data.applyDeadlineEnabled,
        applyDeadlineFriTime: normalizeTime(res.data.applyDeadlineFriTime, '22:00'),
        applyDeadlineSatTime: normalizeTime(res.data.applyDeadlineSatTime, '22:00'),
        applyDeadlineSunTime: normalizeTime(res.data.applyDeadlineSunTime, '12:00'),
      };
      // UI는 마스터 하나로 통일 — 하나라도 ON이면 세 타입 모두 ON으로 맞춤 표시
      setPrefs(withMaster(loaded, anyEnabled(loaded)));
    } else {
      setMsg({ type: 'danger', text: res.error || '알람 설정을 불러오지 못했습니다.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const persistPrefs = async (next, { successMsg = null, warnMsg = null } = {}) => {
    setSaving(true);
    if (!warnMsg) setMsg({ type: '', text: '' });
    setPushError('');

    const payload = {
      missingRecordEnabled: !!next.missingRecordEnabled,
      missingRecordTime: normalizeTime(next.missingRecordTime, '22:00'),
      assignConfirmEnabled: !!next.assignConfirmEnabled,
      applyDeadlineEnabled: !!next.applyDeadlineEnabled,
      applyDeadlineFriTime: normalizeTime(next.applyDeadlineFriTime, '22:00'),
      applyDeadlineSatTime: normalizeTime(next.applyDeadlineSatTime, '22:00'),
      applyDeadlineSunTime: normalizeTime(next.applyDeadlineSunTime, '12:00'),
    };

    const res = await updateAlarmPreferences(payload);
    if (!res.success) {
      setSaving(false);
      setMsg({ type: 'danger', text: res.error || '저장에 실패했습니다.' });
      await loadPrefs();
      return false;
    }

    const saved = {
      missingRecordEnabled: !!res.data.missingRecordEnabled,
      missingRecordTime: normalizeTime(res.data.missingRecordTime, '22:00'),
      assignConfirmEnabled: !!res.data.assignConfirmEnabled,
      applyDeadlineEnabled: !!res.data.applyDeadlineEnabled,
      applyDeadlineFriTime: normalizeTime(res.data.applyDeadlineFriTime, '22:00'),
      applyDeadlineSatTime: normalizeTime(res.data.applyDeadlineSatTime, '22:00'),
      applyDeadlineSunTime: normalizeTime(res.data.applyDeadlineSunTime, '12:00'),
    };
    setPrefs(withMaster(saved, anyEnabled(saved)));

    if (!anyEnabled(payload)) {
      const allRes = await disconnectAllDevices();
      if (!allRes.success) {
        setMsg({
          type: 'warning',
          text: allRes.error || '설정은 저장됐지만 전체 구독 해제에 실패했습니다.',
        });
        setSaving(false);
        return true;
      }
    }

    setSaving(false);
    if (warnMsg) {
      setMsg({ type: 'warning', text: warnMsg });
    } else {
      setMsg({
        type: 'success',
        text: successMsg || '알람 설정이 저장되었습니다.',
      });
    }
    return true;
  };

  const handleMasterToggle = async (enabled) => {
    const next = withMaster(prefs, enabled);
    setPrefs(next);

    let successMsg = null;
    let warnMsg = null;

    if (enabled && !subscribed) {
      if (iosNeedsInstall) {
        warnMsg = '설정은 저장되지만, iOS는 홈 화면 추가 후 이 기기에서 알람을 받을 수 있습니다.';
      } else if (!supported) {
        warnMsg = '설정은 저장되지만, 이 브라우저는 웹 푸시를 지원하지 않아 수신할 수 없습니다.';
      } else if (permission === 'denied') {
        warnMsg =
          '설정은 저장됐지만 알림 권한이 거부되어 이 기기에서는 받을 수 없습니다. 브라우저 설정에서 허용한 뒤 「다시 받기」를 눌러 주세요.';
      } else {
        const connectRes = await connectThisDevice();
        if (connectRes.success) {
          successMsg = '알람을 켰습니다. 이 기기에서 받을 준비가 되었습니다.';
        } else if (connectRes.code === 'PERMISSION_DENIED') {
          warnMsg =
            '설정은 저장됐지만 알림 권한이 거부되어 이 기기에서는 받을 수 없습니다. 브라우저 설정에서 허용한 뒤 「다시 받기」를 눌러 주세요.';
        } else {
          warnMsg = connectRes.error
            ? `설정은 저장했지만 기기 등록에 실패했습니다: ${connectRes.error}`
            : '설정은 저장했지만 기기 등록에 실패했습니다.';
        }
      }
    } else if (!enabled) {
      successMsg = '알람을 껐습니다. 모든 기기 구독이 해제됩니다.';
    }

    await persistPrefs(next, { successMsg, warnMsg });
  };

  const saveTimePatch = async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await persistPrefs(next);
  };

  const handleConnect = async () => {
    setMsg({ type: '', text: '' });
    const res = await connectThisDevice();
    if (res.success) {
      setMsg({ type: 'success', text: '이 기기에서 알람을 받도록 연결했습니다.' });
    } else if (res.code !== 'PERMISSION_DENIED') {
      setMsg({ type: 'danger', text: res.error || '연결에 실패했습니다.' });
    }
  };

  const handleDisconnect = async () => {
    setMsg({ type: '', text: '' });
    const res = await disconnectThisDevice();
    if (res.success) {
      setMsg({ type: 'success', text: '이 기기 알람 연결을 해제했습니다. (다른 기기 연결은 유지)' });
    } else {
      setMsg({ type: 'danger', text: res.error || '해제에 실패했습니다.' });
    }
  };

  const busy = loading || saving || pushBusy;
  const showPermissionHint = permission === 'denied';

  return (
    <Card className="border-0 shadow-sm rounded-4 mb-4">
      <Card.Body className="p-4">
        <div className="fw-bold text-muted small mb-2 d-flex align-items-center gap-1">
          <RiNotification3Line className="text-primary" /> 알람 설정
        </div>
        <p className="text-muted small mb-3">
          허용 시 근무 기록 누락·배정 확정·신청 마감 안내를 모두 받습니다.
          알림 권한과 이 기기 등록이 함께 진행됩니다. 사용하지 않아도 불이익은 없습니다.
        </p>

        {(msg.text || pushError) && (
          <Alert
            variant={msg.type === 'success' ? 'success' : msg.type === 'warning' ? 'warning' : 'danger'}
            className="rounded-3 py-2 small"
          >
            {msg.text || pushError}
          </Alert>
        )}

        {iosNeedsInstall && (
          <Alert variant="info" className="rounded-3 py-2 small">
            <div className="fw-bold mb-1">iPhone·iPad에서는 홈 화면 추가 후 알람을 받을 수 있습니다</div>
            <div className="d-flex align-items-start gap-1">
              <RiShareForwardLine className="mt-1 flex-shrink-0" />
              <span>Safari 하단 공유 버튼 → <strong>홈 화면에 추가</strong> 후, 추가된 앱에서 다시 켜 주세요.</span>
            </div>
          </Alert>
        )}

        {!supported && !iosNeedsInstall && (
          <Alert variant="secondary" className="rounded-3 py-2 small mb-3">
            이 브라우저는 웹 푸시 알람을 지원하지 않습니다. 설정은 저장할 수 있으나 이 기기에서는 수신할 수 없습니다.
          </Alert>
        )}

        {showPermissionHint && (
          <Alert variant="warning" className="rounded-3 py-2 small mb-3">
            알림 권한이 거부되어 있습니다. 브라우저 설정에서 허용한 뒤 「다시 받기」를 눌러 주세요.
            권한을 거부해도 다른 기능은 정상 이용할 수 있습니다.
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" />
          </div>
        ) : (
          <fieldset disabled={busy}>
            <Form.Check
              type="switch"
              id="alarm-master"
              className="mb-3"
              label={<span className="fw-bold">알람 허용</span>}
              checked={alarmsOn}
              onChange={(e) => handleMasterToggle(e.target.checked)}
            />
            <ul className="text-muted small ps-3 mb-4">
              <li>근무 기록 누락 — 설정한 시각에 안내</li>
              <li>근무 배정 확정 — 확정 즉시 안내</li>
              <li>근무 신청 마감 임박 — 금·토·일 설정 시각에 안내</li>
            </ul>

            {alarmsOn && (
              <div
                className="p-3 rounded-3 mb-4"
                style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}
              >
                <div className="fw-bold small mb-3" style={{ color: 'var(--color-input-text)' }}>
                  알림 시각
                </div>

                <Form.Group className="mb-3" style={{ maxWidth: 200 }}>
                  <Form.Label className="fw-bold text-muted small mb-1">근무 기록 누락</Form.Label>
                  <Form.Control
                    type="time"
                    value={prefs.missingRecordTime}
                    onChange={(e) => setPrefs((p) => ({ ...p, missingRecordTime: e.target.value }))}
                    onBlur={(e) =>
                      saveTimePatch({ missingRecordTime: normalizeTime(e.target.value, '22:00') })
                    }
                    className="custom-input"
                  />
                  <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    기본 익일 22:00
                  </div>
                </Form.Group>

                <div className="fw-bold text-muted small mb-2">근무 신청 마감 임박</div>
                <p className="text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                  요일은 금·토·일로 고정되며 시각만 변경할 수 있습니다.
                </p>
                <div className="d-flex flex-column gap-2">
                  {[
                    { key: 'applyDeadlineFriTime', label: '금요일', defaultTime: '22:00' },
                    { key: 'applyDeadlineSatTime', label: '토요일', defaultTime: '22:00' },
                    { key: 'applyDeadlineSunTime', label: '일요일', defaultTime: '12:00' },
                  ].map(({ key, label, defaultTime }) => (
                    <div key={key} className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="fw-bold text-muted small" style={{ width: 52 }}>
                        {label}
                      </span>
                      <Form.Control
                        type="time"
                        value={prefs[key]}
                        onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.value }))}
                        onBlur={(e) =>
                          saveTimePatch({ [key]: normalizeTime(e.target.value, defaultTime) })
                        }
                        className="custom-input"
                        style={{ maxWidth: 160 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        )}

        {/* 이 기기 상태 */}
        <div
          className="p-3 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
          style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}
        >
          <div className="small" style={{ color: 'var(--color-input-text)' }}>
            <strong>이 기기</strong>
            <span className="text-muted ms-2">
              {subscribed ? '알람 수신 중' : '미등록'}
              {permission === 'granted' && ' · 권한 허용'}
              {permission === 'denied' && ' · 권한 거부'}
              {permission === 'default' && ' · 권한 미설정'}
            </span>
            <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
              다른 기기에서도 알람을 켜면 그 기기가 함께 등록됩니다.
            </div>
          </div>
          <div className="d-flex gap-2">
            {subscribed ? (
              <Button
                size="sm"
                variant="outline-secondary"
                className="fw-bold rounded-3"
                disabled={busy || !supported}
                onClick={handleDisconnect}
              >
                {pushBusy ? <Spinner as="span" animation="border" size="sm" /> : '이 기기만 해제'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline-primary"
                className="fw-bold rounded-3"
                disabled={busy || !supported || iosNeedsInstall || permission === 'denied' || !alarmsOn}
                onClick={handleConnect}
              >
                {pushBusy ? <Spinner as="span" animation="border" size="sm" /> : '다시 받기'}
              </Button>
            )}
          </div>
        </div>

        {saving && (
          <div className="text-muted small mt-3 d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" /> 저장 중…
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AlarmSettingsCard;
