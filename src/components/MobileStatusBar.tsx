import { useEffect, useState } from 'react';
import { Battery, Signal, Wifi } from 'lucide-react';

export function MobileStatusBar() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateClock();
    const interval = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-between items-center px-6 py-2.5 select-none bg-[#159d60] text-white font-medium text-xs rounded-t-[38px] w-full">
      <span className="font-semibold tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5 opacity-90"><Signal className="w-3.5 h-3.5" /><Wifi className="w-3.5 h-3.5" /><span className="text-[10px]">85%</span><Battery className="w-4 h-4" /></div>
    </div>
  );
}
