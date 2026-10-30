import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import {
  RiArrowDownSLine,
  RiCalendarCheckLine,
  RiFileList3Line,
  RiNotification3Line,
  RiShareForwardLine,
  RiTimeLine,
} from 'react-icons/ri';
import { fetchAlarmPreferences, updateAlarmPreferences } from '../api/alarmApi';
import useWebPush from '../hooks/useWebPush';
import './AlarmSettingsCard.css';

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
    disconnectAllDevices,
  } = useWebPush();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
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
      setPrefs(withMaster(loaded, anyEnabled(loaded)));
    } else {
      setMsg({ type: 'danger', text: res.error || '알림 설정을 불러오지 못했습니다.' });
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
    } else if (!successMsg) {
      setMsg({ type: '', text: '' });
    }
    return true;
  };

  const handleMasterToggle = async (enabled) => {
    const next = withMaster(prefs, enabled);
    setPrefs(next);
    if (enabled) setOpen(true);

    let warnMsg = null;

    if (enabled && !subscribed) {
      if (iosNeedsInstall) {
        warnMsg = '설정은 저장되지만, iOS는 홈 화면 추가 후 이 기기에서 알림을 받을 수 있습니다.';
      } else if (!supported) {
        warnMsg = '설정은 저장되지만, 이 브라우저는 웹 푸시를 지원하지 않아 수신할 수 없습니다.';
      } else if (permission === 'denied') {
        warnMsg =
          '설정은 저장됐지만 알림 권한이 거부되어 이 기기에서는 받을 수 없습니다. 브라우저 설정에서 허용한 뒤 「기기 추가」를 눌러 주세요.';
      } else {
        const connectRes = await connectThisDevice();
        if (!connectRes.success) {
          if (connectRes.code === 'PERMISSION_DENIED') {
            warnMsg =
              '설정은 저장됐지만 알림 권한이 거부되어 이 기기에서는 받을 수 없습니다. 브라우저 설정에서 허용한 뒤 「기기 추가」를 눌러 주세요.';
          } else {
            warnMsg = connectRes.error
              ? `설정은 저장했지만 기기 등록에 실패했습니다: ${connectRes.error}`
              : '설정은 저장했지만 기기 등록에 실패했습니다.';
          }
        }
      }
    }

    await persistPrefs(next, { warnMsg });
  };

  const saveTimePatch = async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await persistPrefs(next);
  };

  const handleConnect = async () => {
    setMsg({ type: '', text: '' });
    const res = await connectThisDevice();
    if (!res.success && res.code !== 'PERMISSION_DENIED') {
      setMsg({ type: 'danger', text: res.error || '기기 연결에 실패했습니다.' });
    } else if (!res.success && res.code === 'PERMISSION_DENIED') {
      setMsg({
        type: 'warning',
        text: '알림 권한이 거부되어 있습니다. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요.',
      });
    } else if (res.success) {
      setMsg({
        type: 'success',
        text: '현재 기기가 알림 수신 기기로 등록되었습니다.',
      });
    }
  };

  const busy = loading || saving || pushBusy;

  return (
    <Card className="border-0 shadow-sm rounded-4 mb-4">
      <Card.Body className="p-4">
        {loading ? (
          <div className="text-center py-2">
            <Spinner animation="border" size="sm" />
          </div>
        ) : (
          <fieldset disabled={busy} className="alarm-fieldset">
            <div className={`alarm-bar${alarmsOn ? ' alarm-bar--on' : ''}${open ? ' alarm-bar--open' : ''}`}>
              <button
                type="button"
                className="alarm-bar__toggle"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="alarm-settings-panel"
              >
                <RiArrowDownSLine className={`alarm-bar__chevron${open ? ' alarm-bar__chevron--open' : ''}`} />
                <RiNotification3Line className="alarm-bar__icon" />
                <span className="alarm-bar__label">알림 설정</span>
              </button>
              <div className="alarm-bar__actions">
                {alarmsOn && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline-primary"
                    className="alarm-bar__device-btn"
                    disabled={busy || !supported || iosNeedsInstall}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect();
                    }}
                  >
                    {pushBusy ? <Spinner as="span" animation="border" size="sm" /> : '기기 추가'}
                  </Button>
                )}
                <Form.Check
                  type="switch"
                  id="alarm-master"
                  checked={alarmsOn}
                  onChange={(e) => handleMasterToggle(e.target.checked)}
                  aria-label="알림 허용"
                  className="alarm-bar__switch"
                />
              </div>
            </div>

            {open && (
              <div id="alarm-settings-panel" className="alarm-panel">
                {(msg.text || pushError) && (
                  <Alert
                    variant={msg.type === 'success' ? 'success' : msg.type === 'warning' ? 'warning' : 'danger'}
                    className="rounded-3 py-2 small mb-3"
                  >
                    {msg.text || pushError}
                  </Alert>
                )}

                {iosNeedsInstall && (
                  <Alert variant="info" className="rounded-3 py-2 small mb-3">
                    <div className="fw-bold mb-1">iPhone·iPad에서는 홈 화면 추가 후 알림을 받을 수 있습니다</div>
                    <div className="d-flex align-items-start gap-1">
                      <RiShareForwardLine className="mt-1 flex-shrink-0" />
                      <span>Safari 하단 공유 버튼 → <strong>홈 화면에 추가</strong> 후, 추가된 앱에서 다시 켜 주세요.</span>
                    </div>
                  </Alert>
                )}

                {!alarmsOn ? (
                  <p className="alarm-panel__hint">
                    스위치를 켜면 아래 세 가지 근무 알림을 모두 받습니다.
                  </p>
                ) : (
                  <div className="alarm-blocks">
                    <section className="alarm-block">
                      <div className="alarm-block__head">
                        <span className="alarm-block__icon" aria-hidden>
                          <RiFileList3Line />
                        </span>
                        <div>
                          <h3 className="alarm-block__title">1. 근무 기록이 없을 때</h3>
                          <p className="alarm-block__desc">
                            전날 확정된 근무의 출퇴근 기록이 없으면, 아래 시각에 알려 드립니다.
                          </p>
                        </div>
                      </div>
                      <div className="alarm-block__control">
                        <span className="alarm-block__control-label">알림 받을 시각</span>
                        <Form.Control
                          type="time"
                          value={prefs.missingRecordTime}
                          onChange={(e) => setPrefs((p) => ({ ...p, missingRecordTime: e.target.value }))}
                          onBlur={(e) =>
                            saveTimePatch({ missingRecordTime: normalizeTime(e.target.value, '22:00') })
                          }
                          className="custom-input alarm-times__input"
                        />
                      </div>
                    </section>

                    <section className="alarm-block">
                      <div className="alarm-block__head">
                        <span className="alarm-block__icon" aria-hidden>
                          <RiCalendarCheckLine />
                        </span>
                        <div>
                          <h3 className="alarm-block__title">2. 근무 배정이 확정됐을 때</h3>
                          <p className="alarm-block__desc">
                            관리자가 배정을 확정하는 즉시 알림이 갑니다. 시각은 따로 정할 수 없습니다.
                          </p>
                        </div>
                      </div>
                      <div className="alarm-block__note">확정되는 순간 바로 알림</div>
                    </section>

                    <section className="alarm-block">
                      <div className="alarm-block__head">
                        <span className="alarm-block__icon" aria-hidden>
                          <RiTimeLine />
                        </span>
                        <div>
                          <h3 className="alarm-block__title">3. 근무 신청 마감이 다가올 때</h3>
                          <p className="alarm-block__desc">
                            아직 신청하지 않았다면 매주 금·토·일에 알려 드립니다. 요일은 바꿀 수 없고, 받을 시각만 정할 수 있습니다.
                          </p>
                        </div>
                      </div>
                      <div className="alarm-block__days">
                        {[
                          { key: 'applyDeadlineFriTime', label: '금요일', defaultTime: '22:00' },
                          { key: 'applyDeadlineSatTime', label: '토요일', defaultTime: '22:00' },
                          { key: 'applyDeadlineSunTime', label: '일요일', defaultTime: '12:00' },
                        ].map(({ key, label, defaultTime }) => (
                          <div key={key} className="alarm-block__control">
                            <span className="alarm-block__control-label">{label} 알림</span>
                            <Form.Control
                              type="time"
                              value={prefs[key]}
                              onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.value }))}
                              onBlur={(e) =>
                                saveTimePatch({ [key]: normalizeTime(e.target.value, defaultTime) })
                              }
                              className="custom-input alarm-times__input"
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {saving && (
                  <div className="alarm-saving">
                    <Spinner animation="border" size="sm" /> 저장 중…
                  </div>
                )}
              </div>
            )}
          </fieldset>
        )}
      </Card.Body>
    </Card>
  );
};

export default AlarmSettingsCard;
