import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TransparentOverlayProps {
  children: ReactNode;
  isVisible: boolean;
  position: 'top' | 'center' | 'bottom';
  className?: string;
  onClose?: () => void;
  backdropBlur?: 'light' | 'medium' | 'heavy';
  opacity?: number;
  animation?: 'fade' | 'slide' | 'scale';
}

export const TransparentOverlay = ({
  children,
  isVisible,
  position,
  className,
  onClose,
  backdropBlur = 'medium',
  opacity = 0.9,
  animation = 'fade'
}: TransparentOverlayProps) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-4 left-4 right-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      case 'bottom':
        return 'bottom-4 left-4 right-4';
      default:
        return 'top-4 left-4 right-4';
    }
  };

  const getBackdropClasses = () => {
    switch (backdropBlur) {
      case 'light':
        return 'backdrop-blur-[8px]';
      case 'medium':
        return 'backdrop-blur-[12px]';
      case 'heavy':
        return 'backdrop-blur-[16px]';
      default:
        return 'backdrop-blur-[12px]';
    }
  };

  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-out';
    
    if (!isVisible) {
      switch (animation) {
        case 'slide':
          return position === 'bottom' 
            ? `${baseClasses} translate-y-full opacity-0`
            : position === 'top'
            ? `${baseClasses} -translate-y-full opacity-0`
            : `${baseClasses} opacity-0`;
        case 'scale':
          return `${baseClasses} scale-95 opacity-0`;
        case 'fade':
        default:
          return `${baseClasses} opacity-0`;
      }
    }

    return `${baseClasses} opacity-100 scale-100 translate-y-0 translate-x-0`;
  };

  return (
    <div 
      className={cn(
        'fixed z-50 pointer-events-auto',
        getPositionClasses(),
        getAnimationClasses(),
        className
      )}
      style={{ 
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      }}
    >
      {/* CampCompass Transparent Container */}
      <div 
        className={cn(
          'w-full rounded-2xl border border-white/20',
          getBackdropClasses()
        )}
        style={{
          background: 'rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(12px) saturate(180%)'
        }}
      >
        {/* Close button for overlays that support it */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full
                       backdrop-blur-sm border border-white/30 shadow-lg
                       flex items-center justify-center text-gray-600 hover:text-gray-800
                       transition-all duration-200 z-10"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(8px)'
            }}
            aria-label="Close overlay"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};