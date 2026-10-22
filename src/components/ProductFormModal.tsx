import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  AlertCircle
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

  if (!isOpen) return null;

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
      const productPayload = {
        name: name.trim(),
        category,
        subcategory: category === 'Consommables médicaux' ? subcategory : undefined,
        description: description.trim() || undefined,
        status,
        variants,
        image: imageUrl || undefined,
        thumbnailUrl: imageUrl || undefined,
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
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              {initialProduct ? 'Modifier l\'article' : 'Créer un nouvel article médical'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Catalogue Gloryday Pharma · Tarification en FCFA
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
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
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
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
                className="w-full p-2 rounded-xl border border-slate-300 font-medium"
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
                  className="w-full p-2 rounded-xl border border-slate-300 font-medium"
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
                  className="w-full p-2 rounded-xl border border-slate-300 font-bold"
                >
                  <option value="disponible">En stock (Disponible)</option>
                  <option value="rupture">En rupture</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              URL de l'image (facultatif)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300"
            />
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
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2 px-5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold cursor-pointer"
            >
              {submitting ? 'Enregistrement...' : (initialProduct ? 'Mettre à jour' : 'Enregistrer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
