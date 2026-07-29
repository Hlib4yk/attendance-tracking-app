'use client';

import React, { useState } from 'react';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface ImageUploadProps {
  onUpload: (file: File) => void;
  onReject?: (message: string) => void;
  isUploading: boolean;
}

export function ImageUpload({ onUpload, onReject, isUploading }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_MIME.has(file.type)) {
      onReject?.('Дозволені лише JPEG, PNG або WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      onReject?.('Файл завеликий: максимум 10 МБ.');
      return;
    }

    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    onUpload(file);
  };

  const clearPreview = () => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${
          preview ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300 bg-white'
        }`}
      >
        {preview ? (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/5">
              <img src={preview} alt="Попередній перегляд фото аудиторії" className="w-full h-full object-cover" />
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    <p className="text-white font-medium text-sm">Аналіз фото…</p>
                  </div>
                </div>
              )}
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={clearPreview}
                className="text-sm text-rose-500 font-medium hover:text-rose-600 transition-colors"
              >
                Видалити й обрати інше фото
              </button>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer py-12">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Фото аудиторії</h3>
            <p className="text-slate-500 text-sm mb-6">JPEG, PNG або WebP, до 10 МБ</p>
            <div className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
              Обрати файл
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
