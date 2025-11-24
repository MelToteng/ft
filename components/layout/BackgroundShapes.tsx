import React from 'react';

export const BackgroundShapes = () => (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute w-52 h-52 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 top-[10%] right-[10%] animate-[float_8s_ease-in-out_infinite]"></div>
        <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 bottom-[20%] left-[5%] animate-[float_10s_ease-in-out_2s_infinite]"></div>
        <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 top-[50%] right-[20%] animate-[float_6s_ease-in-out_4s_infinite]"></div>
        <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
        50% { transform: translateY(-25px) rotate(180deg) scale(1.05); }
      }
    `}</style>
    </div>
);
