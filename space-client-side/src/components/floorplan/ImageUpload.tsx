import { useState, useEffect } from 'react';

export default function ImageUpload({ 
  onImageUpload, 
  currentImage 
}: { 
  onImageUpload: (file: File) => void;
  currentImage?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  // Set initial preview to current image when available
  useEffect(() => {
    if (currentImage && !preview) {
      setPreview(currentImage);
    }
  }, [currentImage, preview]);

  const handleImageChange = (file: File) => {
    onImageUpload(file);
    
    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <label style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: preview ? 'auto' : '120px',
      border: '2px dashed #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      background: '#f9fafb',
      transition: 'all 0.2s',
      padding: preview ? '12px' : '0'
    }}>
      {preview ? (
        <div style={{ 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '200px', 
              borderRadius: '4px',
              marginBottom: '8px'
            }} 
          />
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            Click to change image
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg
            style={{ width: '32px', height: '32px', color: '#6b7280', marginBottom: '8px' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 4px' }}>
            <span style={{ fontWeight: 600 }}>Click to upload</span> or drag and drop
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            {currentImage ? 'PNG, JPG (Optional)' : 'PNG, JPG (Required)'}
          </p>
        </div>
      )}
      <input
        type="file"
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageChange(file);
        }}
      />
    </label>
  );
};