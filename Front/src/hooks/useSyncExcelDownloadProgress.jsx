import { useRef, useState } from 'react';
import ExcelProgressModal from '../components/ExcelProgressModal';
import { startSyncProgressTicker } from '../utils/syncApiProgress';

/**
 * 동기 blob / FE 생성 엑셀 다운로드용 0~100% 진행 모달 훅.
 * - 0% 오픈 → 10% 시작 → 10~90% 대기(캡) → 100% 후 닫기
 * - task({ signal }) 가 { success, aborted?, error? } 반환 (없으면 성공으로 간주)
 */
export default function useSyncExcelDownloadProgress({
  title = '엑셀 다운로드 중...',
  description = '대용량 파일의 경우 시간이 걸릴 수 있습니다.',
  cancelHint = '요청을 중단합니다. 이미 서버에서 처리 중이면 작업이 계속될 수 있습니다.',
  fallbackError = '엑셀 다운로드에 실패했습니다.',
} = {}) {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modalTitle, setModalTitle] = useState(title);
  const [modalDescription, setModalDescription] = useState(description);
  const abortRef = useRef(null);
  const tickerRef = useRef(null);

  const clear = () => {
    tickerRef.current?.stop();
    tickerRef.current = null;
    abortRef.current = null;
    setActive(false);
    setProgress(0);
    setModalTitle(title);
    setModalDescription(description);
  };

  const cancel = () => {
    abortRef.current?.abort();
    clear();
  };

  /**
   * @param {(ctx: { signal: AbortSignal }) => Promise<{ success?: boolean, aborted?: boolean, error?: string } | void>} task
   * @param {{ title?: string, description?: string, alertOnError?: boolean, fallbackError?: string }} [options]
   */
  const runDownload = async (task, options = {}) => {
    if (active) return { success: false, skipped: true };

    if (options.title) setModalTitle(options.title);
    if (options.description) setModalDescription(options.description);

    setActive(true);
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    setProgress(10);
    tickerRef.current = startSyncProgressTicker({
      from: 10,
      toCap: 90,
      onTick: setProgress,
    });

    try {
      const res = (await task({ signal: controller.signal })) ?? { success: true };
      tickerRef.current?.stop();
      tickerRef.current = null;

      if (res.aborted) {
        clear();
        return res;
      }

      if (res.success === false) {
        clear();
        if (options.alertOnError !== false) {
          alert(res.error || options.fallbackError || fallbackError);
        }
        return res;
      }

      setProgress(100);
      await new Promise((r) => setTimeout(r, 350));
      clear();
      return { success: true };
    } catch (err) {
      tickerRef.current?.stop();
      tickerRef.current = null;
      clear();
      if (options.alertOnError !== false) {
        alert(err?.message || options.fallbackError || fallbackError);
      }
      return { success: false, error: err?.message || fallbackError };
    }
  };

  const ProgressModal = (
    <ExcelProgressModal
      show={active}
      title={modalTitle}
      description={modalDescription}
      progress={progress}
      onCancel={cancel}
      cancelLabel="취소"
      cancelHint={cancelHint}
    />
  );

  return {
    busy: active,
    progress,
    runDownload,
    cancel,
    ProgressModal,
  };
}
