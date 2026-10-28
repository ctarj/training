import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  type?: string;
  minutes?: number;
  points?: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const payload = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
        if (active) setActivities(payload.activities ?? []);
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
      <CapabilityCard title="Activities" description="Track student activity minutes and points.">
        <p role="status">Loading activities...</p>
      </CapabilityCard>
    );
  }

  if (error) {
    return (
      <CapabilityCard title="Activities" description="Track student activity minutes and points.">
        <div role="alert">Unable to load activities: {error}</div>
      </CapabilityCard>
    );
  }

  if (activities.length === 0) {
    return (
      <CapabilityCard title="Activities" description="Track student activity minutes and points.">
        <p>No activities yet.</p>
      </CapabilityCard>
    );
  }

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points.">
      <ul className="list-group list-group-flush">
        {activities.map((activity, index) => (
          <li key={`${activity.type ?? 'activity'}-${index}`} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{activity.type ?? 'Activity'}</span>
            <span>{activity.minutes ?? 0} min</span>
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
