"use client";

import { useCallback, useState, useRef } from "react";
import { ImageIcon, CheckCircle2, AlertCircle, Lightbulb, X, Upload } from "lucide-react";
import Image from "next/image";
import PicturesUploader from "@/components/PicturesUploader";
import { AddPropertySection } from "./AddPropertySection";
import { StepFooter } from "./StepFooter";
import { StepHeader } from "./StepHeader";

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      if (typeof fileReader.result === "string") {
        resolve(fileReader.result);
      } else {
        reject(new Error("Failed to convert file to data URL."));
      }
    };
    fileReader.onerror = () => reject(fileReader.error ?? new Error("Failed to read file."));
    fileReader.readAsDataURL(file);
  });

export function PhotosStep({
  isVisible,
  photos,
  photosSaved,
  photosUploading,
  pickPropertyPhotos,
  setPhotos,
  setPhotosSaved,
  setPhotosUploading,
  goToPreviousStep,
  goToNextStep,
  currentStep,
}: {
  isVisible: boolean;
  photos: string[];
  photosSaved: boolean[];
  photosUploading: boolean[];
  pickPropertyPhotos?: (files: FileList | null) => void | Promise<void>;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setPhotosSaved: React.Dispatch<React.SetStateAction<boolean[]>>;
  setPhotosUploading: React.Dispatch<React.SetStateAction<boolean[]>>;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  currentStep: number;
}) {
  const handleSectionRef = useCallback((el: HTMLElement | null) => {
    if (!el) {
      return;
    }
  }, []);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) {
        return;
      }

      if (pickPropertyPhotos) {
        await pickPropertyPhotos(files);
        return;
      }

      try {
        // Security: Validate file types and sizes
        const validFiles: File[] = [];
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        for (const file of Array.from(files)) {
          // Validate file type
          if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
            console.warn(`Skipping invalid file type: ${file.type}`);
            continue;
          }
          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            console.warn(`Skipping file too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            continue;
          }
          // Additional security: Validate file name doesn't contain dangerous characters
          const sanitizedName = file.name.replace(/[<>:"/\\|?*]/g, '');
          if (sanitizedName !== file.name) {
            console.warn(`File name sanitized: ${file.name} -> ${sanitizedName}`);
          }
          validFiles.push(file);
        }

        if (validFiles.length === 0) {
          return;
        }

        const dataUrls = await Promise.all(validFiles.map(readFileAsDataUrl));
        const nextPhotos = [...photos, ...dataUrls];
        const nextSaved = [...photosSaved, ...dataUrls.map(() => false)];
        const nextUploading = [...photosUploading, ...dataUrls.map(() => false)];

        setPhotos(nextPhotos);
        setPhotosSaved(nextSaved);
        setPhotosUploading(nextUploading);
      } catch (error) {
        console.error("Failed to process selected photo files.", error);
      }
    },
    [photos, photosSaved, photosUploading, pickPropertyPhotos, setPhotos, setPhotosSaved, setPhotosUploading]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files?.length) {
        void handleUpload(files);
      }
    },
    [handleUpload]
  );
  
  const minRequired = 3;
  const photosCount = photos.length;
  const photosOk = photosCount >= minRequired;
  const photosNeeded = Math.max(0, minRequired - photosCount);
  
  return (
    <AddPropertySection
      as="section"
      sectionRef={handleSectionRef}
      isVisible={isVisible}
      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm"
    >
      {isVisible && (
        <div className="w-full">
          <StepHeader
            step={5}
            title="Property photos"
            description="Upload at least 3 clear photos. More photos increase bookings."
          />
          <div className="pt-4 space-y-6">
            {/* Status Card - Modern Design */}
            <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white px-4 sm:px-5 py-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all duration-300 ${
                    photosOk
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {photosCount}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Photos uploaded</span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-gray-600">
                      {photosOk ? (
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Requirement met
                        </span>
                      ) : (
                        <>
                          Need <span className="font-bold text-emerald-600">{minRequired}+</span> to continue
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  photosOk
                    ? "bg-emerald-50 border-emerald-200/50"
                    : "bg-amber-50 border-amber-200/50"
                }`}>
                  {photosOk ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <div className={`text-xs font-semibold ${
                    photosOk ? "text-emerald-700" : "text-amber-700"
                  }`}>
                    {photosOk ? "Ready to submit" : `${photosNeeded} more needed`}
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Quality Tips - Modern Card Design */}
            <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Photo Quality Tips</h3>
                  <p className="text-xs text-gray-600">Follow these guidelines for best results</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Use high resolution</div>
                    <div className="text-xs text-gray-600">Minimum 1200x800px recommended</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Good lighting</div>
                    <div className="text-xs text-gray-600">Natural light works best</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Show key areas</div>
                    <div className="text-xs text-gray-600">Exterior, living, bedroom, bathroom, kitchen</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-gray-900">File format</div>
                    <div className="text-xs text-gray-600">JPG, PNG, or WEBP (max 10MB each)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Preview Thumbnails - Prominent Display */}
            {photos.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Uploaded Photos</h3>
                    <p className="text-xs text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-md hover:-translate-y-1"
                    >
                      {/^https?:\/\//i.test(photo) ? (
                        <Image
                          src={photo}
                          alt={`Property photo ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={`Property photo ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextPhotos = photos.filter((_, i) => i !== index);
                          const nextSaved = photosSaved.filter((_, i) => i !== index);
                          const nextUploading = photosUploading.filter((_, i) => i !== index);
                          setPhotos(nextPhotos);
                          setPhotosSaved(nextSaved);
                          setPhotosUploading(nextUploading);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-600 shadow-lg"
                        aria-label={`Remove photo ${index + 1}`}
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {photosUploading[index] && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {photosSaved[index] && (
                        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos Uploader Card - Modern Design with Drag & Drop */}
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-xl border-2 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 ${
                isDragging
                  ? "border-emerald-400 bg-emerald-50/30 shadow-lg scale-[1.02]"
                  : "border-gray-200 hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Upload className={`w-5 h-5 text-emerald-600 transition-transform duration-300 ${isDragging ? "scale-110" : ""}`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Upload Photos <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500">
                    {isDragging ? (
                      <span className="font-semibold text-emerald-600">Drop files here to upload</span>
                    ) : (
                      <>Drag and drop photos here, or click to browse (JPG, PNG, WEBP - max 10MB each)</>
                    )}
                  </p>
                </div>
              </div>
              {isDragging && (
                <div className="mb-4 p-4 rounded-lg bg-emerald-100 border-2 border-dashed border-emerald-400 text-center">
                  <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm font-semibold text-emerald-700">Drop your photos here</p>
                </div>
              )}
              <PicturesUploader
                title="Property Photos"
                minRequired={minRequired}
                images={photos}
                onUpload={(files) => {
                  void handleUpload(files);
                }}
                onRemove={(index) => {
                  const nextPhotos = photos.filter((_, i) => i !== index);
                  const nextSaved = photosSaved.filter((_, i) => i !== index);
                  const nextUploading = photosUploading.filter((_, i) => i !== index);

                  setPhotos(nextPhotos);
                  setPhotosSaved(nextSaved);
                  setPhotosUploading(nextUploading);
                }}
                saved={photosSaved}
                onSave={(index) => {
                  const nextSaved = photosSaved.map((value, i) => (i === index ? true : value));
                  setPhotosSaved(nextSaved);
                }}
                inputId="propertyPhotosInput"
                uploading={photosUploading}
              />
            </div>
          </div>
        </div>
      )}

      {isVisible && (
        <StepFooter
          onPrev={goToPreviousStep}
          onNext={goToNextStep}
          prevDisabled={currentStep <= 0}
          nextDisabled={currentStep >= 5}
        />
      )}
    </AddPropertySection>
  );
}


