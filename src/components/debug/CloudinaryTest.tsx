'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CloudinaryTest() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-cloudinary');
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult({ success: true, ...result });
      } else {
        const error = await response.json();
        setUploadResult({ success: false, error });
      }
    } catch (error) {
      setUploadResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Cloudinary Debug Panel</h2>
      
      {/* Connection Test */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Connection Test</h3>
        <Button onClick={testConnection} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Test Cloudinary Connection'}
        </Button>
        
        {testResult && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Upload Test */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Upload Test</h3>
        <input
          type="file"
          accept="image/*"
          onChange={testUpload}
          disabled={isUploading}
          className="mb-3"
        />
        
        {isUploading && (
          <p className="text-blue-600">Uploading...</p>
        )}
        
        {uploadResult && (
          <div className="mt-4">
            <div className={`p-3 rounded-lg ${
              uploadResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {uploadResult.success ? (
                <div>
                  <p className="text-green-700 font-medium">Upload Successful!</p>
                  <p className="text-sm text-gray-600 mt-1">URL: {uploadResult.url}</p>
                  {uploadResult.url && (
                    <img 
                      src={uploadResult.url} 
                      alt="Uploaded" 
                      className="mt-3 max-w-xs rounded border"
                    />
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-red-700 font-medium">Upload Failed</p>
                  <pre className="text-sm mt-2 text-red-600">
                    {JSON.stringify(uploadResult.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Quick Test Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Test Cloudinary Connection" - should show success message</li>
          <li>Select an image file to test upload</li>
          <li>If both work, your Cloudinary integration is ready!</li>
        </ol>
      </div>
    </div>
  );
} 