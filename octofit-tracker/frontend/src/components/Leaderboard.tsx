import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardRow = {
  teamName?: string;
  totalPoints?: number;
  rank?: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const payload = await getJson<{ leaderboard: LeaderboardRow[] }>('/api/leaderboard');
        if (active) setEntries(payload.leaderboard ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unavailable');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <CapabilityCard title="Leaderboard" description="Compare team point totals.">
        <p role="status">Loading leaderboard...</p>
      </CapabilityCard>
    );
  }

  if (error) {
    return (
      <CapabilityCard title="Leaderboard" description="Compare team point totals.">
        <div role="alert">Unable to load leaderboard: {error}</div>
      </CapabilityCard>
    );
  }

  if (entries.length === 0) {
    return (
      <CapabilityCard title="Leaderboard" description="Compare team point totals.">
        <p>No leaderboard yet.</p>
      </CapabilityCard>
    );
  }

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals.">
      <ol className="list-group list-group-numbered">
        {entries.map((entry) => (
          <li key={`${entry.teamName ?? 'team'}-${entry.rank ?? 'rank'}`} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{entry.teamName ?? 'Unknown team'}</span>
            <span>{entry.totalPoints ?? 0}</span>
          </li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
