import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Camera,
  Upload,
  Link2,
  CheckCircle2,
  RefreshCw,
  Download,
  Sparkles
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { api } from '../api';
import { CATEGORIES, CONSUMABLE_SUBCATEGORIES } from '../data/initialProducts';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  initialProduct?: Product | null;
}

const MAX_IMAGE_DIMENSION = 1000;
const IMAGE_QUALITY = 0.82;
const MAX_PDF_SIZE_BYTES = 6 * 1024 * 1024; // 6 Mo max pour la notice PDF

function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} Ko`;
  return `${(kb / 1024).toFixed(2)} Mo`;
}

function estimateDataUrlBytes(dataUrl: string): number {
  if (!dataUrl.startsWith('data:')) return 0;
  const base64Part = dataUrl.split(',')[1] || '';
  return Math.round((base64Part.length * 3) / 4);
}

async function compressAndResizeImageFile(file: File): Promise<{ dataUrl: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image sélectionné.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non reconnu. Utilisez JPG, PNG ou WebP.'));
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            if (width >= height) {
              height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
              width = MAX_IMAGE_DIMENSION;
            } else {
              width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
              height = MAX_IMAGE_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Impossible d’initialiser la compression graphique.'));
            return;
          }

          // Fond blanc propre pour les images PNG transparentes
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let dataUrl = canvas.toDataURL('image/webp', IMAGE_QUALITY);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
          }

          resolve({
            dataUrl,
            sizeBytes: estimateDataUrlBytes(dataUrl)
          });
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Erreur lors de la compression de la photo.'));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProduct
}) => {
  const [name, setName] = useState(initialProduct?.name || '');
  const [category, setCategory] = useState(initialProduct?.category || 'Consommables médicaux');
  const [subcategory, setSubcategory] = useState(initialProduct?.subcategory || 'Seringues et perfusion');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [status, setStatus] = useState<'disponible' | 'rupture'>(initialProduct?.status || 'disponible');
  const [imageUrl, setImageUrl] = useState(initialProduct?.image || '');
  const [imageSourceMode, setImageSourceMode] = useState<'gallery_camera' | 'url'>('gallery_camera');
  const [compressedSizeInfo, setCompressedSizeInfo] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  // Live Camera / Webcam states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // File input refs
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // PDF Notice states
  const [pdfNoticeUrl, setPdfNoticeUrl] = useState(initialProduct?.pdfNoticeUrl || '');
  const [pdfNoticeName, setPdfNoticeName] = useState(initialProduct?.pdfNoticeName || '');
  const [pdfFileToUpload, setPdfFileToUpload] = useState<File | null>(null);
  const [pdfSizeInfo, setPdfSizeInfo] = useState<string | null>(null);
  const pdfPreviewUrlRef = useRef<string | null>(null);

  const [isPromotion, setIsPromotion] = useState(initialProduct?.isPromotion || false);
  const [discountPercentage, setDiscountPercentage] = useState(initialProduct?.discountPercentage || 0);
  const [originalPrice, setOriginalPrice] = useState(initialProduct?.originalPrice || 0);
  const [quantityAvailable, setQuantityAvailable] = useState<number>(
    typeof initialProduct?.quantityAvailable === 'number'
      ? initialProduct.quantityAvailable
      : typeof initialProduct?.stockQuantity === 'number'
        ? initialProduct.stockQuantity
        : 0
  );
  const [alertThreshold, setAlertThreshold] = useState<number>(
    typeof initialProduct?.alertThreshold === 'number'
      ? initialProduct.alertThreshold
      : typeof initialProduct?.lowStockAlertThreshold === 'number'
        ? initialProduct.lowStockAlertThreshold
        : 10
  );
  const [purchasePrice, setPurchasePrice] = useState<number>(
    initialProduct?.purchasePrice || 0
  );
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialProduct?.variants && initialProduct.variants.length > 0
      ? initialProduct.variants
      : [{ label: 'Boîte de 100 unités', price: 7500 }]
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const clearPdfPreviewUrl = () => {
    if (pdfPreviewUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewUrlRef.current);
      pdfPreviewUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      clearPdfPreviewUrl();
      setPdfFileToUpload(null);
      return;
    }
    setName(initialProduct?.name || '');
    setCategory(initialProduct?.category || 'Consommables médicaux');
    setSubcategory(initialProduct?.subcategory || 'Seringues et perfusion');
    setDescription(initialProduct?.description || '');
    setStatus(initialProduct?.status || 'disponible');
    setImageUrl(initialProduct?.image || '');
    setCompressedSizeInfo(
      initialProduct?.image?.startsWith('data:image/')
        ? `Photo optimisée (${formatByteSize(estimateDataUrlBytes(initialProduct.image))})`
        : null
    );
    setPdfNoticeUrl(initialProduct?.pdfNoticeUrl || '');
    setPdfNoticeName(initialProduct?.pdfNoticeName || '');
    setPdfFileToUpload(null);
    clearPdfPreviewUrl();
    setPdfSizeInfo(
      initialProduct?.pdfNoticeUrl?.startsWith('data:application/pdf')
        ? formatByteSize(estimateDataUrlBytes(initialProduct.pdfNoticeUrl))
        : null
    );
    setIsPromotion(initialProduct?.isPromotion || false);
    setDiscountPercentage(initialProduct?.discountPercentage || 0);
    setOriginalPrice(initialProduct?.originalPrice || 0);
    setQuantityAvailable(
      typeof initialProduct?.quantityAvailable === 'number'
        ? initialProduct.quantityAvailable
        : typeof initialProduct?.stockQuantity === 'number'
          ? initialProduct.stockQuantity
          : 0
    );
    setAlertThreshold(
      typeof initialProduct?.alertThreshold === 'number'
        ? initialProduct.alertThreshold
        : typeof initialProduct?.lowStockAlertThreshold === 'number'
          ? initialProduct.lowStockAlertThreshold
          : 10
    );
    setPurchasePrice(initialProduct?.purchasePrice || 0);
    setVariants(
      initialProduct?.variants && initialProduct.variants.length > 0
        ? initialProduct.variants
        : [{ label: 'Boîte de 100 unités', price: 7500 }]
    );
    setError(null);
    setCameraError(null);
  }, [isOpen, initialProduct]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      clearPdfPreviewUrl();
    };
  }, []);

  if (!isOpen) return null;

  const processSelectedImageFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide (JPG, PNG, WebP).');
      return;
    }
    try {
      setIsCompressingImage(true);
      setError(null);
      const originalSize = formatByteSize(file.size);
      const { dataUrl, sizeBytes } = await compressAndResizeImageFile(file);
      setImageUrl(dataUrl);
      setCompressedSizeInfo(`Optimisée : ${formatByteSize(sizeBytes)} (original : ${originalSize})`);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du traitement de la photo.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await processSelectedImageFile(file);
  };

  const startLiveCamera = async (preferredFacing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Basculement direct vers l'appareil photo natif du téléphone
      nativeCameraInputRef.current?.click();
      return;
    }

    try {
      stopCameraStream();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredFacing },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      cameraStreamRef.current = stream;
      setCameraFacingMode(preferredFacing);
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current && cameraStreamRef.current) {
          videoRef.current.srcObject = cameraStreamRef.current;
          void videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      // Si la permission navigateur/iframe bloque la webcam, ouvrir l'appareil photo natif
      setCameraError('Ouverture du sélecteur appareil photo de votre appareil...');
      nativeCameraInputRef.current?.click();
    }
  };

  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    void startLiveCamera(nextFacing);
  };

  const handleCapturePhotoFromVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    const rawW = video.videoWidth || 1000;
    const rawH = video.videoHeight || 750;
    let width = rawW;
    let height = rawH;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width >= height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let dataUrl = canvas.toDataURL('image/webp', IMAGE_QUALITY);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
    }

    const sizeBytes = estimateDataUrlBytes(dataUrl);
    setImageUrl(dataUrl);
    setCompressedSizeInfo(`Photo capturée & compressée (${formatByteSize(sizeBytes)})`);
    stopCameraStream();
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Veuillez choisir un document au format PDF (.pdf) pour la notice technique.');
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setError(`Le document PDF dépasse la limite autorisée de 6 Mo (taille : ${formatByteSize(file.size)}).`);
      return;
    }

    setError(null);
    clearPdfPreviewUrl();
    const previewUrl = URL.createObjectURL(file);
    pdfPreviewUrlRef.current = previewUrl;
    setPdfNoticeUrl(previewUrl);
    setPdfFileToUpload(file);
    setPdfNoticeName(file.name);
    setPdfSizeInfo(formatByteSize(file.size));
  };

  const handleAddVariant = () => {
    setVariants(prev => [...prev, { label: 'Conditionnement', price: 10000 }]);
  };

  const handleUpdateVariant = (index: number, field: 'label' | 'price', value: any) => {
    setVariants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: field === 'price' ? parseInt(value, 10) || 0 : value };
      return copy;
    });
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom du produit est obligatoire');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      let cleanImage = imageUrl.trim();
      let cleanPdfUrl = pdfNoticeUrl.trim();
      const cleanPdfName = pdfNoticeName.trim();

      // Send binary media directly to Supabase Storage. Only public URLs are
      // included in the product JSON, keeping Vercel API payloads small.
      if (cleanImage.startsWith('data:image/')) {
        const imageResponse = await fetch(cleanImage);
        if (!imageResponse.ok) throw new Error('Impossible de préparer la photo compressée.');
        const imageBlob = await imageResponse.blob();
        cleanImage = await api.uploadProductMedia(imageBlob, 'image');
        setImageUrl(cleanImage);
      }
      if (pdfFileToUpload) {
        cleanPdfUrl = await api.uploadProductMedia(pdfFileToUpload, 'pdf');
        clearPdfPreviewUrl();
        setPdfFileToUpload(null);
        setPdfNoticeUrl(cleanPdfUrl);
      }

      const productPayload = {
        name: name.trim(),
        category,
        subcategory: category === 'Consommables médicaux' ? subcategory : undefined,
        description: description.trim() || undefined,
        status,
        variants,
        image: cleanImage,
        thumbnailUrl: cleanImage,
        pdfNoticeUrl: cleanPdfUrl,
        pdfNoticeName: cleanPdfUrl ? (cleanPdfName || 'Notice_technique.pdf') : '',
        isPromotion,
        discountPercentage: isPromotion ? Number(discountPercentage) || 0 : undefined,
        originalPrice: isPromotion ? Number(originalPrice) || 0 : undefined,
        quantityAvailable: Number(quantityAvailable) || 0,
        stockQuantity: Number(quantityAvailable) || 0,
        alertThreshold: Number(alertThreshold) || 10,
        lowStockAlertThreshold: Number(alertThreshold) || 10,
        purchasePrice: Number(purchasePrice) || 0
      };

      let result: Product;
      if (initialProduct) {
        result = await api.updateProduct(initialProduct.id, productPayload);
      } else {
        result = await api.createProduct(productPayload);
      }
      stopCameraStream();
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du produit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              {initialProduct ? 'Modifier l\'article' : 'Créer un nouvel article médical'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Catalogue Gloryday Pharma · Photo Galerie / Caméra & Notice PDF
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              clearPdfPreviewUrl();
              setPdfFileToUpload(null);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Désignation de l'article *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Seringue 3 pièces 5ml..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0d44e8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 font-medium bg-white"
              >
                {CATEGORIES.filter(c => c !== 'Tous les articles').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {category === 'Consommables médicaux' ? (
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Sous-catégorie
                </label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-medium bg-white"
                >
                  {CONSUMABLE_SUBCATEGORIES.filter(s => s !== 'Toutes les sous-catégories').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Disponibilité
                </label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="disponible">En stock (Disponible)</option>
                  <option value="rupture">En rupture</option>
                </select>
              </div>
            )}
          </div>

          {/* ==========================================
              PHOTO PRINCIPALE : GALERIE, APPAREIL PHOTO & URL
             ========================================== */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#0d44e8]" />
                <span className="font-bold text-slate-800 uppercase">
                  Photo principale du produit
                </span>
              </div>

              <div className="inline-flex rounded-xl bg-slate-200/70 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setImageSourceMode('gallery_camera')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    imageSourceMode === 'gallery_camera'
                      ? 'bg-white text-[#0d44e8] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Galerie / Appareil photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setImageSourceMode('url');
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    imageSourceMode === 'url'
                      ? 'bg-white text-[#0d44e8] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  <span>Lien URL</span>
                </button>
              </div>
            </div>

            {/* Hidden Native File Inputs */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleGalleryFileChange}
              className="hidden"
            />
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleGalleryFileChange}
              className="hidden"
            />

            {imageSourceMode === 'gallery_camera' ? (
              <div className="space-y-3">
                {/* Action Buttons: Galerie vs Prendre en photo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isCompressingImage}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-[#0d44e8]/50 flex items-center gap-2.5 text-left transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0d44e8] group-hover:bg-[#0d44e8] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block">
                        Depuis la galerie / fichier
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Photothèque téléphone ou PC
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void startLiveCamera('environment')}
                    disabled={isCompressingImage}
                    className="p-3 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-500/50 flex items-center gap-2.5 text-left transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block">
                        Prendre en photo
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Caméra en direct ou mobile
                      </span>
                    </div>
                  </button>
                </div>

                {/* Live Camera Viewfinder if active */}
                {isCameraOpen && (
                  <div className="p-3 rounded-2xl bg-slate-900 text-white space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Caméra active · Cadrez le produit médical
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleToggleCameraFacing}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Changer de caméra (avant / arrière)"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Inverser</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCameraStream}
                          className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 text-[10px] font-bold cursor-pointer"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 max-h-60 mx-auto flex items-center justify-center border border-slate-700">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          stopCameraStream();
                          nativeCameraInputRef.current?.click();
                        }}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Appareil photo natif mobile
                      </button>

                      <button
                        type="button"
                        onClick={handleCapturePhotoFromVideo}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capturer et compresser la photo</span>
                      </button>
                    </div>
                  </div>
                )}

                {cameraError && !isCameraOpen && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    {cameraError}
                  </p>
                )}

                {/* Drag & Drop or Empty State if no image yet */}
                {!imageUrl && !isCameraOpen && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(true);
                    }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      void processSelectedImageFile(droppedFile);
                    }}
                    onClick={() => galleryInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                      isDraggingImage
                        ? 'border-[#0d44e8] bg-blue-50/70'
                        : 'border-slate-300 hover:border-[#0d44e8]/60 bg-white/70'
                    }`}
                  >
                    <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700">
                      {isCompressingImage
                        ? 'Compression et redimensionnement rapides en cours...'
                        : 'Glissez-déposez une photo ici ou touchez pour choisir dans la galerie'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Compression automatique haute netteté (max 1000 px · chargement ultra-rapide)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  placeholder="https://exemple.com/photo-produit.jpg"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setCompressedSizeInfo(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0d44e8]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Collez un lien direct vers une image hébergée en ligne.
                </p>
              </div>
            )}

            {/* Preview of current product photo */}
            {imageUrl && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Aperçu produit"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-900 truncate">
                        Photo du produit prête
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {compressedSizeInfo || 'Image externe liée au produit'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                  >
                    Changer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setCompressedSizeInfo(null);
                    }}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==========================================
              NOTICE / FICHE TECHNIQUE (DOCUMENT PDF)
             ========================================== */}
          <div className="p-3.5 rounded-2xl bg-blue-50/40 border border-blue-200/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0d44e8]" />
                <span className="font-bold text-slate-800 uppercase">
                  Notice / Fiche technique PDF (Depuis vos documents)
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                Facultatif
              </span>
            </div>

            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handlePdfFileChange}
              className="hidden"
            />

            {!pdfNoticeUrl ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={submitting}
                  className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-[#0d44e8] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    Importer un PDF depuis mes documents
                  </span>
                </button>
                <span className="text-[10px] text-slate-500">
                  Permet aux cliniques et hôpitaux de télécharger la fiche technique ou le certificat CE/ISO.
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-white border border-blue-200 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={pdfNoticeName}
                      onChange={(e) => setPdfNoticeName(e.target.value)}
                      placeholder="Nom du document PDF..."
                      className="font-bold text-slate-900 text-xs bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none w-full truncate"
                    />
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      Document PDF joint {pdfSizeInfo ? `(${pdfSizeInfo})` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={pdfNoticeUrl}
                    download={pdfNoticeName || 'Notice_technique.pdf'}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold text-[11px] flex items-center gap-1"
                    title="Télécharger / Vérifier le PDF"
                  >
                    <Download className="w-3 h-3" />
                    <span>Vérifier</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                  >
                    Remplacer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearPdfPreviewUrl();
                      setPdfFileToUpload(null);
                      setPdfNoticeUrl('');
                      setPdfNoticeName('');
                      setPdfSizeInfo(null);
                    }}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                    title="Retirer le document PDF"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Description technique
            </label>
            <textarea
              rows={2}
              placeholder="Spécifications, stérile, norme..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300"
            />
          </div>

          {/* Promotion / Réduction */}
          <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPromotion}
                  onChange={(e) => setIsPromotion(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-xs text-rose-900 uppercase">
                  Activer une promotion / réduction
                </span>
              </label>
              {isPromotion && (
                <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  Badge promo actif
                </span>
              )}
            </div>

            {isPromotion && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Pourcentage remise (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    placeholder="ex: 20"
                    value={discountPercentage || ''}
                    onChange={(e) => setDiscountPercentage(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ancien prix barré (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="ex: 9500"
                    value={originalPrice || ''}
                    onChange={(e) => setOriginalPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stock Réel, Quantité Disponible, Seuil d'Alerte & Prix d'Achat */}
          <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-3">
            <span className="font-bold text-xs text-emerald-950 uppercase block">
              Stock Réel, Seuil d'Alerte & Marge B2B
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Quantité disponible *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Saisir le stock réel"
                  value={quantityAvailable}
                  onChange={(e) => setQuantityAvailable(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                />
                <p className="mt-1 text-[10px] text-slate-500">Un stock nul ou non renseigné bloque les commandes.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Seuil d'alerte rupture *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="ex: 10"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value, 10) || 10)}
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Prix d'achat unitaire (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ex: 4500"
                  value={purchasePrice || ''}
                  onChange={(e) => setPurchasePrice(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Lorsque le stock disponible descend en dessous du seuil d'alerte, un indicateur d'urgence s'affiche dans le back-office.
            </p>
          </div>

          {/* Variants */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 uppercase">
                Conditionnements & Tarifs (FCFA sans TVA)
              </span>
              <button
                type="button"
                onClick={handleAddVariant}
                className="text-[#0d44e8] font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    required
                    placeholder="Libellé (ex: Boîte de 100)"
                    value={v.label}
                    onChange={(e) => handleUpdateVariant(idx, 'label', e.target.value)}
                    className="flex-1 p-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <div className="w-28 relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0 = sur devis"
                      value={v.price}
                      onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                      className="w-full p-1.5 pr-8 rounded-lg border border-slate-300 bg-white font-bold text-right tabular-nums"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">F</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    disabled={variants.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                clearPdfPreviewUrl();
                setPdfFileToUpload(null);
                onClose();
              }}
              className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || isCompressingImage}
              className="py-2 px-5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : (initialProduct ? 'Mettre à jour' : 'Enregistrer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
