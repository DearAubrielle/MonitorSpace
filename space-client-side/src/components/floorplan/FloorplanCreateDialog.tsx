import { useRef, useState } from 'react';
import styles from './FloorplanCreateDialog.module.css';

interface FloorplanCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; imageFile: File | null }) => Promise<boolean | undefined>;
  ImageUpload: React.ComponentType<{ onImageUpload: (file: File) => void }>;
}

export default function FloorplanCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  ImageUpload,
}: FloorplanCreateDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; image?: string }>({});

  if (!open) return null;

  const validateForm = () => {
    const newErrors: { name?: string; image?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Enter a name for your floorplan.';
    }

    if (!imageFile) {
      newErrors.image = 'Choose a floorplan image before creating it.';
    }

    setErrors(newErrors);
    if (newErrors.name) nameRef.current?.focus();
    else if (newErrors.image) imageRef.current?.focus();
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (await onSubmit({ name, description, imageFile })) {
        setName('');
        setDescription('');
        setImageFile(null);
        setErrors({});
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
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
              ref={nameRef}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "floorplan-name-error" : undefined}
              type="text"
              autoComplete="off"
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
            {errors.name && <p id="floorplan-name-error" role="alert" className={styles.errorText}>{errors.name}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              autoComplete="off"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Floorplan Image *</label>
            <div ref={imageRef} tabIndex={-1} role="group" aria-label="Floorplan image" aria-describedby={errors.image ? "floorplan-image-error" : undefined} className={errors.image ? styles.imageUploadError : ''}>
              <ImageUpload
                onImageUpload={(file) => {
                  setImageFile(file);
                  if (errors.image) {
                    setErrors((prev) => ({ ...prev, image: undefined }));
                  }
                }}
              />
            </div>
            {errors.image && <p id="floorplan-image-error" role="alert" className={styles.errorText}>{errors.image}</p>}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={handleCancel}>
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
