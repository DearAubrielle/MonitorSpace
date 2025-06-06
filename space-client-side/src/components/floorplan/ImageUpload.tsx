import { useState } from 'react';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  onImageUpload: (imageData: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        setPreviewImage(imageData);
        onImageUpload(imageData); // Pass the image data to the parent component
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={styles.imageUploadContainer}>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className={styles.fileInput}
      />
      {previewImage && (
        <div className={styles.previewContainer}>
          <img src={previewImage} alt="Uploaded Preview" className={styles.previewImage} />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;