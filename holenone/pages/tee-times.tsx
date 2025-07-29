import { useEffect, useState } from 'react';

export default function TeeTimesPage() {
  const [teeTimes, setTeeTimes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/TeeTimes?date=Jul+30+2025')
      .then(res => res.json())
      .then(data => setTeeTimes(data.teeTimes))
      .catch(err => console.error('Failed to load tee times', err));
  }, []);

  return (
    <div>
      <h1>Available Tee Times</h1>
      <ul>
        {teeTimes.map((tt, i) => (
          <li key={i}>
            <strong>{tt.time}</strong> - {tt.price}
          </li>
        ))}
      </ul>
    </div>
  );
}