"use client";
import { supabase } from '../supabase/client'; // adjust path if needed
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('test_table').select('*').limit(1);
      if (error) setError(error.message);
      else setData(data);
    }
    fetchData();
  }, []);

  return (
    <div>
      <h1>Supabase Connection Test</h1>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      {!data && !error && <div>Loading...</div>}
    </div>
  );
}
