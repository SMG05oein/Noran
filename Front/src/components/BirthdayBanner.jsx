import useThemeStore from '../store/useThemeStore';
import { RiCake2Line } from 'react-icons/ri';

const BirthdayBanner = ({ userName }) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const displayName = userName || '직원';

  return (
    <div
      className="birthday-banner rounded-4 p-3 p-md-4 mb-3 mb-md-4 shadow-sm position-relative overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #2A1D13 0%, #241A12 50%, #1E1610 100%)'
          : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)',
        border: isDark ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1.5px solid #F59E0B',
        boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.35)' : '0 2px 8px rgba(245, 158, 11, 0.15)',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <style>{`
        @keyframes dance-crazy {
          0% {
            transform: translateY(0) rotate(-15deg) scaleX(0.9);
          }
          50% {
            transform: translateY(-12px) rotate(0deg) scaleX(1.1);
          }
          100% {
            transform: translateY(0) rotate(15deg) scaleX(0.9);
          }
        }
        .dancing-onigiri {
          display: inline-block;
          animation: dance-crazy 0.4s infinite alternate ease-in-out;
          transform-origin: bottom center;
        }
      `}</style>

      <div className="d-flex align-items-center gap-3">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center shadow-xs flex-shrink-0"
          style={{
            width: '54px',
            height: '54px',
            backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FFFFFF',
            color: isDark ? '#FBBF24' : '#D97706',
            border: isDark ? '1.5px solid rgba(252, 211, 77, 0.35)' : '2px solid #FCD34D',
          }}
        >
          <RiCake2Line size={30} />
        </div>

        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span
              className="badge px-2 py-1 rounded-pill fw-bold shadow-xs"
              style={{
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              HAPPY BIRTHDAY
            </span>
            <span
              className="small fw-bold d-inline-flex align-items-center gap-1"
              style={{ color: isDark ? '#FCD34D' : '#92400E' }}
            >
              👑 오늘의 주인공! 둠칫둠칫
              <span className="dancing-onigiri ms-1" style={{ fontSize: '22px', lineHeight: 1 }} role="img" aria-label="춤추는 돼지">
                🐷
              </span>
            </span>
          </div>

          <h5
            className="fw-bold mb-1 text-truncate"
            style={{ color: isDark ? '#FDE68A' : '#92400E' }}
          >
            생일을 진심으로 축하합니다, <span style={{ color: isDark ? '#FBBF24' : '#B45309' }}>{displayName}</span>님!
          </h5>

          <p
            className="mb-0 small fw-semibold"
            style={{ color: isDark ? '#D1D5DB' : '#78350F', opacity: isDark ? 0.95 : 0.9 }}
          >
            오늘 하루 온 세상에서 가장 기분 좋고 행복한 시간 보내세요!
          </p>
        </div>

        <div
          className="d-none d-md-flex align-items-center justify-content-center pe-2"
        >
          <span className="dancing-onigiri" style={{ fontSize: '44px', lineHeight: 1 }} role="img" aria-label="춤추는 돼지">
            🐷
          </span>
        </div>
      </div>
    </div>
  );
};

export default BirthdayBanner;
