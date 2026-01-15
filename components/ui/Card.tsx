import React, { useRef, useState } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  enableTilt?: boolean;
}

export const Card: React.FC<CardProps> = ({ className = '', children, enableTilt = false, ...props }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const div = cardRef.current;
    const rect = div.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotateY = ((mouseX - width / 2) / width) * 20; // Max rotation deg
    const rotateX = ((mouseY - height / 2) / height) * -20;

    if (enableTilt) {
      setRotation({ x: rotateX, y: rotateY });
    }
    
    setPosition({ x: mouseX, y: mouseY });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setOpacity(0);
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`
        relative glass-panel-card rounded-3xl text-slate-100 overflow-hidden transition-all duration-300 group
        ${className}
      `}
      style={{
        transform: enableTilt ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` : 'none',
        transition: 'transform 0.1s ease-out'
      }}
      {...props}
    >
      {/* Spotlight Effect */}
      <div 
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-10"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-20 h-full">
        {children}
      </div>
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 md:p-8 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...props }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`p-6 md:p-8 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`flex items-center p-6 md:p-8 pt-0 ${className}`} {...props}>
    {children}
  </div>
);