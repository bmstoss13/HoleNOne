import React from 'react';
import { LucideIcon } from 'lucide-react';

interface QuickActionProps { 
  text: string; 
  onClick: () => void;
  icon?: React.ReactElement<LucideIcon>;
}

export default function QuickAction({ text, onClick, icon }: QuickActionProps) {
  return (
    <button className="quick-action" onClick={onClick}>
      {icon && React.cloneElement(icon)}
      {text}
    </button>
  );
}