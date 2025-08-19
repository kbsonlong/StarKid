import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string, storagePath: string) => void;
  onError?: (error: string) => void;
  maxImages?: number;
  existingImages?: Array<{ id: string; url?: string; path?: string; image_url?: string; storage_path?: string }>;
  uploadedImages?: Array<{ id: string; url?: string; path?: string; image_url?: string; storage_path?: string }>;
  onImageRemoved?: (imageId: string) => void;
}

interface UploadedImage {
  id: string;
  url?: string;
  path?: string;
  image_url?: string;
  storage_path?: string;
  file?: File;
  uploading?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onError,
  maxImages = 3,
  existingImages = [],
  uploadedImages = [],
  onImageRemoved
}) => {
  const [images, setImages] = useState<UploadedImage[]>(
    [...(existingImages || []), ...(uploadedImages || [])].map(img => ({ 
      ...img, 
      uploading: false,
      url: img.url || (img as any).image_url,
      path: img.path || (img as any).storage_path
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // 最大1MB
      maxWidthOrHeight: 1920, // 最大宽度或高度
      useWebWorker: true,
      fileType: 'image/jpeg' as const
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('图片压缩失败:', error);
      return file; // 如果压缩失败，返回原文件
    }
  };

  const uploadToSupabase = async (file: File): Promise<{ url: string; path: string }> => {
    if (!user) {
      throw new Error('用户未登录');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('behavior-images')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`上传失败: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('behavior-images')
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      onError?.(`最多只能上传${maxImages}张图片`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        onError?.('请选择图片文件');
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB限制
        onError?.('图片大小不能超过10MB');
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const tempImage: UploadedImage = {
        id: tempId,
        url: URL.createObjectURL(file),
        path: '',
        file,
        uploading: true
      };

      setImages(prev => [...prev, tempImage]);

      try {
        setIsUploading(true);
        const compressedFile = await compressImage(file);
        const { url, path } = await uploadToSupabase(compressedFile);
        
        setImages(prev => prev.map(img => 
          img.id === tempId 
            ? { ...img, url, path, uploading: false, file: undefined }
            : img
        ));
        
        onImageUploaded(url, path);
      } catch (error) {
        console.error('上传失败:', error);
        onError?.(error instanceof Error ? error.message : '上传失败');
        
        // 移除失败的图片
        setImages(prev => prev.filter(img => img.id !== tempId));
        URL.revokeObjectURL(tempImage.url);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    const imageToRemove = images.find(img => img.id === imageId);
    if (!imageToRemove) return;

    // 如果是已上传的图片，从Supabase删除
    if (imageToRemove.path && !imageToRemove.uploading) {
      try {
        await supabase.storage
          .from('behavior-images')
          .remove([imageToRemove.path]);
        
        onImageRemoved?.(imageId);
      } catch (error) {
        console.error('删除图片失败:', error);
        onError?.('删除图片失败');
        return;
      }
    }

    // 从本地状态移除
    setImages(prev => prev.filter(img => img.id !== imageId));
    
    // 释放临时URL
    if (imageToRemove.file) {
      URL.revokeObjectURL(imageToRemove.url);
    }
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      {/* 上传按钮 */}
      {canAddMore && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Camera className="w-4 h-4" />
            拍照
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            选择图片
          </button>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* 图片预览网格 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={image.url}
                  alt="上传的图片"
                  className="w-full h-full object-cover"
                />
                
                {/* 上传中遮罩 */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              {/* 删除按钮 */}
              {!image.uploading && (
                <button
                  type="button"
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 提示信息 */}
      <div className="text-sm text-gray-500">
        <p>• 最多可上传{maxImages}张图片</p>
        <p>• 支持JPG、PNG格式，单张图片不超过10MB</p>
        <p>• 图片将自动压缩以节省存储空间</p>
      </div>
    </div>
  );
};