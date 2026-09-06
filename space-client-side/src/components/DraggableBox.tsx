import { useDraggable } from '@dnd-kit/core';
import { useState, useEffect, useRef } from 'react';
import { DEFAULT_DEVICE_ICON } from '../utils/deviceIcon';
import { getDeviceBoxSize } from '../utils/handleDragEnd';
import CameraHoverPreview from './CameraHoverPreview';

// Add CSS animation for alert pulsing
const addAlertAnimation = () => {
  if (typeof document !== 'undefined' && !document.getElementById('alert-pulse-animation')) {
    const style = document.createElement('style');
    style.id = 'alert-pulse-animation';
    style.textContent = `
      @keyframes alertPulse {
        0%, 100% {
          opacity: 1;
          filter: brightness(1);
          background-color: rgba(220, 38, 38, 0.92);
          border-color: rgba(254, 226, 226, 1);
          box-shadow:
            0 4px 12px rgba(127, 29, 29, 0.42),
            0 0 15px 6px rgba(239, 68, 68, 0.42),
            0 0 30px 14px rgba(220, 38, 38, 0.2);
        }
        50% {
          opacity: 1;
          filter: brightness(1.12) saturate(1.18);
          background-color: rgba(250, 204, 21, 0.96);
          border-color: rgba(255, 251, 235, 1);
          box-shadow:
            0 4px 13px rgba(161, 98, 7, 0.4),
            0 0 17px 7px rgba(250, 204, 21, 0.44),
            0 0 34px 16px rgba(234, 179, 8, 0.2);
        }
      }
    `;
    document.head.appendChild(style);
  }
};

export const BOX_SIZE_PERCENT = 0.07;
export const MIN_BOX_SIZE = 20;
export const MAX_BOX_SIZE = 40;

export type PercentPosition = {
  x: number; // 0 to 1
  y: number; // 0 to 1
};

export interface DraggableBoxProps {
  id: string;
  label: string;
  position: PercentPosition;
  containerWidth: number;
  containerHeight: number;
  iconURL?: string;
  onClick?: (event?: React.PointerEvent) => void;
  disabled?: boolean;
  alert?: boolean;
  deviceName?: string;
  value?: string | number;
  unit?: string;
  useBuiltInModal?: boolean; // New prop to control modal behavior
  cameraPreviewUrl?: string;
  dragging?: boolean;
}

export default function DraggableBox({
  id,
  position,
  containerWidth,
  containerHeight,
  iconURL,
  onClick,
  disabled = true,
  alert = false,
  deviceName,
  value,
  unit,
  useBuiltInModal = false,
  cameraPreviewUrl,
  dragging = false,
}: DraggableBoxProps) {
  const boxSize = getDeviceBoxSize(containerWidth);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipCloseTimer = useRef<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [resolvedIconURL, setResolvedIconURL] = useState(iconURL || DEFAULT_DEVICE_ICON);

  useEffect(() => {
    const nextIconURL = iconURL || DEFAULT_DEVICE_ICON;
    const image = new Image();
    image.onload = () => setResolvedIconURL(nextIconURL);
    image.onerror = () => setResolvedIconURL(DEFAULT_DEVICE_ICON);
    image.src = nextIconURL;
  }, [iconURL]);

  // Add animation styles on component mount
  useEffect(() => {
    addAlertAnimation();
    return () => {
      if (tooltipCloseTimer.current !== null) window.clearTimeout(tooltipCloseTimer.current);
    };
  }, []);

  const openTooltip = () => {
    if (tooltipCloseTimer.current !== null) window.clearTimeout(tooltipCloseTimer.current);
    tooltipCloseTimer.current = null;
    setShowTooltip(true);
  };

  const scheduleTooltipClose = () => {
    if (tooltipCloseTimer.current !== null) window.clearTimeout(tooltipCloseTimer.current);
    tooltipCloseTimer.current = window.setTimeout(() => {
      setShowTooltip(false);
      tooltipCloseTimer.current = null;
    }, cameraPreviewUrl ? 220 : 0);
  };

  const left = position.x * (containerWidth - boxSize);
  const top = position.y * (containerHeight - boxSize);

  // Format value with unit
  const formatValue = () => {
    if (value === undefined || value === null || value === '') return 'No data';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  // Handle detail modal click
  const handleDetailClick = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    setShowDetailModal(true);
  };

  // Close modal when clicking outside
  const handleModalClose = () => {
    setShowDetailModal(false);
  };

  // Get tooltip colors based on alert status
  const getTooltipColors = () => {
    if (alert) {
      return {
        backgroundColor: 'rgba(127, 29, 29, 0.96)',
        borderColor: 'rgba(127, 29, 29, 0.96)',
        textColor: '#fff7ed',
        shadowColor: 'rgba(127, 29, 29, 0.36)',
        mutedTextColor: '#fecaca',
        accentColor: '#fca5a5',
        dividerColor: 'rgba(254, 202, 202, 0.22)',
      };
    }
    return {
      backgroundColor: 'rgba(15, 23, 42, 0.96)',
      borderColor: 'rgba(15, 23, 42, 0.96)',
      textColor: '#f8fafc',
      shadowColor: 'rgba(15, 23, 42, 0.28)',
      mutedTextColor: '#cbd5e1',
      accentColor: '#7dd3fc',
      dividerColor: 'rgba(203, 213, 225, 0.18)',
    };
  };

  const tooltipColors = getTooltipColors();

  // Create detailed modal content
  const detailModal = showDetailModal ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleModalClose}
    >
      <div
        style={{
          backgroundColor: alert ? 'rgba(226, 92, 92, 0.95)' : 'rgba(30, 30, 30, 0.95)',
          color: 'white',
          padding: '24px',
          borderRadius: '16px',
          minWidth: '300px',
          maxWidth: '500px',
          border: alert ? '2px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: alert
            ? '0 20px 40px rgba(220, 38, 38, 0.4), 0 0 20px rgba(220, 38, 38, 0.3)'
            : '0 20px 40px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            paddingBottom: '12px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {alert && <span style={{ fontSize: '20px' }}>⚠️</span>}
            {deviceName || 'Device Details'}
          </h3>
          <button
            onClick={handleModalClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              opacity: 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          >
            ×
          </button>
        </div>

        {/* Value Display */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '8px',
              fontFamily: 'monospace',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              color: alert ? '#ffeb3b' : '#4bb5dfff',
            }}
          >
            {value !== undefined && value !== null && value !== '' ? value : 'No data'}
          </div>
          {unit && (
            <div
              style={{
                fontSize: '18px',
                opacity: 0.8,
                marginBottom: '12px',
              }}
            >
              {unit}
            </div>
          )}
          {alert && (
            <div
              style={{
                backgroundColor: 'rgba(255, 235, 59, 0.2)',
                color: '#ffeb3b',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'inline-block',
                border: '1px solid rgba(255, 235, 59, 0.3)',
              }}
            >
              🚨 ALERT
            </div>
          )}
        </div>

        {/* Device Info */}
        <div
          style={{
            fontSize: '14px',
            opacity: 0.9,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong>Device ID:</strong> {id}
          </div>
          {deviceName && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Name:</strong> {deviceName}
            </div>
          )}
          <div style={{ marginBottom: '8px' }}>
            <strong>Status:</strong> {alert ? 'Alert' : 'Normal'}
          </div>
          <div>
            <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={handleModalClose}
            style={{
              background: alert ? '#f3b43eff' : 'linear-gradient(135deg, #2c7a9eff 0%, #4c5da8ff 100%)',
              border: 'none',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Create tooltip content
  const tooltipContent =
    deviceName || value !== undefined ? (
      <div
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: tooltipColors.backgroundColor,
          color: tooltipColors.textColor,
          minWidth: '154px',
          padding: '10px 12px 9px',
          borderRadius: '10px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          marginBottom: '10px',
          boxShadow: `0 8px 24px ${tooltipColors.shadowColor}`,
          zIndex: 1000,
          pointerEvents: 'none',
          border: `1px solid ${alert ? 'rgba(254, 202, 202, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '5px',
            color: tooltipColors.accentColor,
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tooltipColors.accentColor,
              boxShadow: alert ? '0 0 0 3px rgba(252, 165, 165, 0.14)' : 'none',
            }}
          />
          {alert ? 'Alert' : 'Normal'}
        </div>
        {deviceName && (
          <div
            style={{
              fontWeight: 650,
              fontSize: '12px',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '190px',
            }}
          >
            {deviceName}
          </div>
        )}
        {value !== undefined && (
          <div
            style={{
              color: value === null || value === '' ? tooltipColors.mutedTextColor : tooltipColors.textColor,
              fontSize: value === null || value === '' ? '11px' : '15px',
              fontWeight: value === null || value === '' ? 500 : 700,
              lineHeight: 1.4,
              marginTop: '1px',
            }}
          >
            {formatValue()}
          </div>
        )}
        {useBuiltInModal && (
          <div
            style={{
              color: tooltipColors.mutedTextColor,
              fontSize: '9px',
              marginTop: '7px',
              borderTop: `1px solid ${tooltipColors.dividerColor}`,
              paddingTop: '6px',
              lineHeight: 1.2,
            }}
          >
            Click for details
          </div>
        )}
        {/* Tooltip arrow */}
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid ${tooltipColors.borderColor}`,
          }}
        />
      </div>
    ) : null;

  // Get box colors based on alert status
  const getBoxColors = () => {
    if (alert) {
      return {
        backgroundColor: 'rgba(220, 38, 38, 0.8)', // Strong red for alerts
        borderColor: 'rgba(239, 68, 68, 0.8)', // Lighter red border
        boxShadow: '0 4px 30px rgba(220, 38, 38, 0.6)', // Red glow
        pulse: true,
      };
    }
    return {
      backgroundColor: 'rgba(218, 239, 235, 0.82)',
      borderColor: 'rgba(255, 255, 255, 0.9)',
      boxShadow: '0 5px 14px rgba(26, 44, 47, 0.25), inset 0 1px rgba(255, 255, 255, 0.56)',
      pulse: false,
    };
  };

  const boxColors = getBoxColors();

  const style: React.CSSProperties = {
    position: 'absolute',
    zIndex: showTooltip ? 3000 : isDragging ? 2000 : 1,
    top,
    left,
    width: boxSize,
    height: boxSize,
    boxSizing: 'border-box',
    fontSize: '12px',
    color: 'white',
    backgroundColor: boxColors.backgroundColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '24%',
    backdropFilter: 'blur(5px)',
    border: `1px solid ${boxColors.borderColor}`,
    boxShadow: boxColors.boxShadow,
    margin: 0,
    padding: 0,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    cursor: disabled ? 'pointer' : isDragging ? 'grabbing' : 'grab',
    touchAction: disabled ? undefined : 'none',
    userSelect: isDragging ? 'none' : undefined,
    willChange: isDragging ? 'transform' : undefined,
    opacity: dragging ? 0 : 1,
    visibility: dragging ? 'hidden' : 'visible',
    // Add pulsing animation for alerts
    animation: alert && !dragging ? 'alertPulse 1.2s ease-in-out infinite' : undefined,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        {...(!disabled ? listeners : {})}
        {...(!disabled ? attributes : {})}
        style={style}
        onPointerUp={(e) => {
          if (useBuiltInModal) {
            handleDetailClick(e);
          } else {
            onClick?.(e);
          }
        }}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleTooltipClose}
      >
        <img
          src={resolvedIconURL}
          alt=""
          draggable={false}
          style={{
            display: 'block',
            width: '84%',
            height: '84%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
        {/* Camera devices get a live hover card; other devices keep the compact value tooltip. */}
        {showTooltip && cameraPreviewUrl ? (
          <CameraHoverPreview
            name={deviceName || 'Camera'}
            streamUrl={cameraPreviewUrl}
            align={position.x > 0.64 ? 'left' : 'right'}
            onMouseEnter={openTooltip}
            onMouseLeave={scheduleTooltipClose}
          />
        ) : (
          showTooltip && tooltipContent
        )}
      </div>

      {/* Detail Modal */}
      {detailModal}
    </>
  );
}
