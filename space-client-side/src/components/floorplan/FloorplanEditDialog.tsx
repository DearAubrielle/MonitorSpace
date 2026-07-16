import { useState, useEffect } from 'react';
import styles from './FloorplanCreateDialog.module.css'; // Reuse the same styles

interface FloorplanEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { id: number; name: string; description: string; imageFile: File | null }) => void;
  onDelete?: () => void;
  ImageUpload: React.ComponentType<{ onImageUpload: (file: File) => void; currentImage?: string }>;
  floorplan: {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
  } | null;
  serverUrl: string;
}

export default function FloorplanEditDialog({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  ImageUpload,
  floorplan,
  serverUrl,
}: FloorplanEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when floorplan changes
  useEffect(() => {
    if (floorplan) {
      setName(floorplan.name || '');
      setDescription(floorplan.description || '');
      setImageFile(null); // Reset image file
      setErrors({});
    }
  }, [floorplan]);

  if (!open || !floorplan) return null;

  const validateForm = () => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onSubmit({
      id: floorplan.id,
      name,
      description,
      imageFile,
    });

    // Reset form
    setName('');
    setDescription('');
    setImageFile(null);
    setErrors({});
  };

  const handleCancel = () => {
    onOpenChange(false);
    setShowDeleteConfirm(false); // Reset delete confirmation
    // Reset to original values
    if (floorplan) {
      setName(floorplan.name || '');
      setDescription(floorplan.description || '');
      setImageFile(null);
      setErrors({});
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onOpenChange(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Check if form has changes
  const hasChanges = name !== floorplan.name || description !== (floorplan.description || '') || imageFile !== null;

  const isFormValid = name.trim();

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Floorplan</h2>
          <p className={styles.description}>Update floorplan details. Leave image unchanged or upload a new one.</p>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-name" className={styles.label}>
              Name *
            </label>
            <input
              id="edit-name"
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name && e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="Enter floorplan name"
              required
            />
            {errors.name && <p className={styles.errorText}>{errors.name}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-description" className={styles.label}>
              Description
            </label>
            <textarea
              id="edit-description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Floorplan Image
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}>
                (Optional - leave unchanged or upload new)
              </span>
            </label>
            <ImageUpload
              onImageUpload={(file) => setImageFile(file)}
              currentImage={
                floorplan.image_url
                  ? floorplan.image_url.startsWith('http')
                    ? floorplan.image_url
                    : serverUrl + floorplan.image_url
                  : undefined
              }
            />
            {imageFile && (
              <p style={{ fontSize: '12px', color: '#059669', margin: '4px 0 0' }}>
                New image selected: {imageFile.name}
              </p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {/* Left side - Delete button */}
            <div>
              {onDelete && !showDeleteConfirm && (
                <button
                  className={`${styles.button}`}
                  onClick={handleDelete}
                  style={{
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626',
                    color: 'white',
                    border: '1px solid #dc2626',
                  }}
                >
                  Delete
                </button>
              )}

              
            </div>

            {/* Right side - Cancel and Update buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={handleCancel}>
                Cancel
              </button>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleSubmit}
                disabled={!isFormValid || !hasChanges}
                style={{
                  opacity: isFormValid && hasChanges ? 1 : 0.5,
                  cursor: isFormValid && hasChanges ? 'pointer' : 'not-allowed',
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
