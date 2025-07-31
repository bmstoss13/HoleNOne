import React from "react";

interface Props { time: string; price?: string; onBook: () => void; }
export default function TeeTimeCard({ time, price, onBook }: Props) {
  return (
    <div className="tee-time-card">
      <span>{time}</span>
      {price && <span>{price}</span>}
      <button onClick={onBook}>Book</button>
    </div>
  );
}
