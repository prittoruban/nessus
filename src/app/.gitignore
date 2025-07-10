"use client";

import { useState } from 'react';
import { supabase } from '../supabase/client';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }
    setUploading(true);
    // Upload to 'uploads' bucket in Supabase Storage
    const { data, error } = await supabase.storage.from('uploads').upload(`public/${file.name}`, file, {
      cacheControl: '3600',
      upsert: false,
    });
    setUploading(false);
    if (error) {
      setMessage(`Upload failed: ${error.message}`);
    } else {
      setMessage(`File uploaded successfully! Path: ${data?.path}`);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h1>Upload a File to Supabase Storage</h1>
      <form onSubmit={handleUpload}>
        <label htmlFor="file-upload">Select file to upload:</label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          title="Select file to upload"
        />
        <button type="submit" disabled={uploading} style={{ marginLeft: 12 }}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <div style={{ marginTop: 16, color: message.startsWith('Upload failed') ? 'red' : 'green' }}>{message}</div>}
    </div>
  );
}