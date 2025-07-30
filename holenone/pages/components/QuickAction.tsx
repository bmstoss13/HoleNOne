interface QuickActionProps { text: string; onClick: () => void; }
export default function QuickAction({ text, onClick }: QuickActionProps) {
  return <button className="quick-action" onClick={onClick}>{text}</button>;
}