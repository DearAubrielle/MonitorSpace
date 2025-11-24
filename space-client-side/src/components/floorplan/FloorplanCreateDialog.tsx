import { useState } from 'react';
import styles from './FloorplanCreateDialog.module.css';

interface FloorplanCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; imageFile: File | null }) => void;
  ImageUpload: React.ComponentType<{ onImageUpload: (file: File) => void }>;
}

export default function FloorplanCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  ImageUpload,
}: FloorplanCreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ name?: string; image?: string }>({});

  if (!open) return null;

  const validateForm = () => {
    const newErrors: { name?: string; image?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!imageFile) {
      newErrors.image = 'Image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onSubmit({ name, description, imageFile });
    setName('');
    setDescription('');
    setImageFile(null);
    setErrors({});
  };

  const handleCancel = () => {
    onOpenChange(false);
    setName('');
    setDescription('');
    setImageFile(null);
    setErrors({});
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Check if form is valid for submit button styling
  const isFormValid = name.trim() && imageFile;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create Floorplan</h2>
          <p className={styles.description}>Add a new floorplan with details and an image. Image is required.</p>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              Name *
            </label>
            <input
              id="name"
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
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Floorplan Image *</label>
            <div className={errors.image ? styles.imageUploadError : ''}>
              <ImageUpload
                onImageUpload={(file) => {
                  setImageFile(file);
                  if (errors.image) {
                    setErrors((prev) => ({ ...prev, image: undefined }));
                  }
                }}
              />
            </div>
            {errors.image && <p className={styles.errorText}>{errors.image}</p>}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={handleCancel}>
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSubmit}
            disabled={!isFormValid}
            style={{
              opacity: isFormValid ? 1 : 0.5,
              cursor: isFormValid ? 'pointer' : 'not-allowed',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
