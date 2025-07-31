import React, { useEffect, useState } from 'react';
import './App.css'; // Ensure this is imported

// Helper component for the header buttons like LCARS 23295
interface LcarsHeaderButtonBlockProps {
  text: string;
  colorClass: 'orange' | 'blue' | 'peach' | 'pink' | 'red' | 'tan';
  align: 'left' | 'right';
  onClick?: () => void;
}

const LcarsHeaderButtonBlock: React.FC<LcarsHeaderButtonBlockProps> = ({
  text,
  colorClass,
  align,
  onClick,
}) => {
  return (
    <div
      className={`lcars-header-button-block ${colorClass} ${align === 'left' ? 'left-rounded' : 'right-rounded'}`}
      onClick={onClick}
    >
      {align === 'left' && <div className="end-cap"></div>}
      <div className="text-label">{text}</div>
      {align === 'right' && <div className="end-cap"></div>}
    </div>
  );
};

// Header Component
const LcarsHeader: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-GB', { hour12: false }));
      setCurrentDate(
        now
          .toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
          .replace(/\//g, '.'),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="lcars-header-component">
      {/* Top bar with buttons */}
      <div className="lcars-header-top-bar">
        <div className="left-group">
          <LcarsHeaderButtonBlock
            text="LCARS 23295"
            colorClass="peach"
            align="right"
          />
          <LcarsHeaderButtonBlock
            text="01-23584"
            colorClass="blue"
            align="left"
          />
        </div>
        <div className="lcars-date-display">
          <span>FRIDAY</span>{' '}
          <span style={{ color: 'var(--lcars-orange)' }}>&#x2022;</span>{' '}
          <span>{currentDate || '22. 03. 2019'}</span>
        </div>
        <div className="right-group">
          <div className="quit-button-area">
            <LcarsHeaderButtonBlock
              text="07-3215"
              colorClass="orange"
              align="right"
            />
            <LcarsHeaderButtonBlock
              text="QUIT"
              colorClass="red"
              align="right"
            />
          </div>
          <div className="quit-button-area" style={{ marginLeft: '5px' }}>
            <LcarsHeaderButtonBlock
              text="09-2548"
              colorClass="peach"
              align="right"
            />
            <LcarsHeaderButtonBlock
              text="10-9215"
              colorClass="tan"
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Main title bar row */}
      <div className="lcars-header-row">
        <div className="lcars-header-left-curve"></div>
        <div className="lcars-header-title-bar">MASTER SITUATION DISPLAY</div>
        {/* This space can be used for other elements if needed, or just be part of the title bar's flex properties */}
      </div>

      {/* Bottom segmented bar with time */}
      <div className="lcars-header-bottom-bar">
        <div className="lcars-time-date">{currentTime || '12:31:42'}</div>
        <div className="segment-1"></div>
        <div className="segment-2"></div>
        <div className="segment-3"></div>
        <div className="segment-4"></div>
        <div className="segment-5"></div>
      </div>
    </header>
  );
};

export default LcarsHeader;
