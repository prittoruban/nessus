'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ConnectionTest() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; source_type: string }>>([])

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setStatus('loading')
      
      // Test client-side connection
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .limit(5)

      if (error) {
        throw error
      }

      setStatus('success')
      setMessage('✅ Supabase connection successful!')
      setOrganizations(data || [])
    } catch (error) {
      setStatus('error')
      setMessage(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testServerConnection = async () => {
    try {
      setStatus('loading')
      setMessage('Testing server connection...')
      
      const response = await fetch('/api/test-connection')
      const result = await response.json()
      
      if (result.success) {
        setStatus('success')
        setMessage('✅ Server connection successful!')
        setOrganizations(result.organizations || [])
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      setStatus('error')
      setMessage(`❌ Server connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🔗 Supabase Connection Test
        </h1>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={testConnection}
              disabled={status === 'loading'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Test Client Connection
            </button>
            
            <button
              onClick={testServerConnection}
              disabled={status === 'loading'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Test Server Connection
            </button>
          </div>

          <div className={`p-4 rounded-lg ${
            status === 'success' ? 'bg-green-50 text-green-800' :
            status === 'error' ? 'bg-red-50 text-red-800' :
            'bg-gray-50 text-gray-800'
          }`}>
            <p className="font-medium">{message}</p>
            {status === 'loading' && (
              <div className="mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {organizations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                📋 Organizations Found ({organizations.length})
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid gap-2">
                  {organizations.map((org, index) => (
                    <div key={org.id || index} className="flex justify-between items-center p-2 bg-white rounded border">
                      <span className="font-medium">{org.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        org.source_type === 'internal' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {org.source_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">⚙️ Configuration Status</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
              <p>• Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
