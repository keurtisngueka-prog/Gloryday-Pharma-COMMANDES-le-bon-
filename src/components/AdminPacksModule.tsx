import React, { useMemo, useRef, useState } from 'react';
import { Layers, Plus, Edit, Trash2, CheckCircle2, Eye, EyeOff, Search, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { Pack, Product, User } from '../types';
import { logAuditEvent } from '../utils/auditLogger';
import { api } from '../api';

async function compressPackPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Le format de la photo n’a pas pu être lu. Choisissez un fichier JPG, PNG ou WebP.');
  }
  try {
    const maxDimension = 1000;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Impossible de préparer la photo du pack.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const toBlob = (type: string, quality: number) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
    const webp = await toBlob('image/webp', 0.82);
    const optimized = webp?.type === 'image/webp' ? webp : await toBlob('image/jpeg', 0.82);
    if (!optimized) throw new Error('La compression de la photo a échoué.');
    if (optimized.size > 6 * 1024 * 1024) {
      const smaller = await toBlob(optimized.type, 0.68);
      if (!smaller || smaller.size > 6 * 1024 * 1024) throw new Error('La photo reste trop volumineuse après optimisation (maximum 6 Mo).');
      return smaller;
    }
    return optimized;
  } finally {
    bitmap.close();
  }
}

interface AdminPacksModuleProps {
  packs: Pack[];
  products: Product[];
  currentUser: User;
  onCreatePack: (pack: Omit<Pack, 'id'>) => Promise<void>;
  onUpdatePack: (id: string, pack: Partial<Pack>) => Promise<void>;
  onDeletePack: (id: string) => Promise<void>;
}

export const AdminPacksModule: React.FC<AdminPacksModuleProps> = ({
  packs,
  products,
  currentUser,
  onCreatePack,
  onUpdatePack,
  onDeletePack
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(50000);
  const [image, setImage] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<{ productName: string; variant?: string; quantity: number }[]>([
    { productName: products[0]?.name || 'Gants d\'examen', quantity: 10 }
  ]);

  const matchingProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase('fr');
    return products.filter(product => !query || [product.name, product.category, ...product.variants.map(variant => variant.label)]
      .some(value => String(value || '').toLocaleLowerCase('fr').includes(query))).slice(0, 8);
  }, [products, productSearch]);
  const packCatalogValue = useMemo(() => items.reduce((total, item) => {
    const product = products.find(candidate => candidate.name === item.productName);
    const variant = product?.variants.find(candidate => candidate.label === item.variant) || product?.variants[0];
    return total + Math.max(0, variant?.originalPrice ?? variant?.price ?? 0) * Math.max(0, Number(item.quantity) || 0);
  }, 0), [items, products]);
  const unpricedItemCount = items.filter(item => {
    const product = products.find(candidate => candidate.name === item.productName);
    const variant = product?.variants.find(candidate => candidate.label === item.variant) || product?.variants[0];
    return !variant || (variant.originalPrice ?? variant.price) <= 0;
  }).length;

  const addProductToPack = (product: Product) => {
    const variant = product.variants[0]?.label;
    setItems(current => {
      const existingIndex = current.findIndex(item => item.productName === product.name && item.variant === variant);
      if (existingIndex >= 0) return current.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productName: product.name, variant, quantity: 1 }];
    });
  };

  const handlePhotoSelected = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choisissez une photo JPG, PNG ou WebP.');
      return;
    }
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const optimized = await compressPackPhoto(file);
      const publicUrl = await api.uploadProductMedia(optimized, 'image', 'pack');
      setImage(publicUrl);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'La photo n’a pas pu être envoyée.');
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleOpenCreate = () => {
    setEditingPack(null);
    setTitle('');
    setDescription('');
    setPrice(45000);
    setImage('');
    setProductSearch('');
    setPhotoError('');
    setItems([{ productName: products[0]?.name || 'Kit médical', quantity: 5 }]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pack: Pack) => {
    setEditingPack(pack);
    setTitle(pack.title);
    setDescription(pack.description);
    setPrice(pack.price);
    setImage(pack.image);
    setProductSearch('');
    setPhotoError('');
    setItems(pack.items.length > 0 ? pack.items : [{ productName: products[0]?.name || 'Dispositif', quantity: 1 }]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (photoBusy) return;
    const cleanItems = items.filter(item => item.productName.trim() && Number.isSafeInteger(item.quantity) && item.quantity > 0);
    if (cleanItems.length === 0) {
      setPhotoError('Ajoutez au moins un article avec une quantité valide.');
      return;
    }

    if (editingPack) {
      await onUpdatePack(editingPack.id, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        image: image.trim() || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
        items: cleanItems
      });
      logAuditEvent(
        currentUser,
        'creation_pack',
        'Pack Dotation',
        editingPack.id,
        `Modification du pack ${title} (${price.toLocaleString('fr-FR')} FCFA)`
      );
    } else {
      await onCreatePack({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        image: image.trim() || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
        items: cleanItems,
        active: true
      });
      logAuditEvent(
        currentUser,
        'creation_pack',
        'Pack Dotation',
        'NEW_PACK',
        `Création du pack promotionnel ${title} (${price.toLocaleString('fr-FR')} FCFA)`
      );
    }

    setIsModalOpen(false);
  };

  const handleToggleActive = async (pack: Pack) => {
    await onUpdatePack(pack.id, { active: !pack.active });
  };

  const handleDelete = async (pack: Pack) => {
    if (window.confirm(`Supprimer définitivement le pack "${pack.title}" ?`)) {
      await onDeletePack(pack.id);
      logAuditEvent(
        currentUser,
        'suppression_pack',
        'Pack Dotation',
        pack.id,
        `Suppression du pack ${pack.title}`
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Gestionnaire des Packs de Dotation Cliniques
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurez les kits groupés (bloc, accouchement, réanimation) affichés sur le catalogue client.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Pack</span>
        </button>
      </div>

      {/* Packs Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`p-3.5 border rounded-xl flex flex-col justify-between transition-all ${
              pack.active ? 'border-slate-200 bg-white' : 'border-slate-200/60 bg-slate-50/70 opacity-70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 text-sm">{pack.title}</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {pack.price.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <p className="text-slate-500 text-xs line-clamp-2 mb-2">{pack.description}</p>
              
              <div className="bg-slate-50 p-2 rounded-lg space-y-1 mb-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Composition du pack :</div>
                {pack.items.map((it, i) => (
                  <div key={i} className="text-slate-700 flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    {it.variant && <span className="text-slate-400 font-mono text-[10px]">{it.variant}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => handleToggleActive(pack)}
                className={`flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                  pack.active ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {pack.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{pack.active ? 'Actif sur le catalogue' : 'Désactivé'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(pack)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pack)}
                  className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-2 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <h3 className="font-bold text-sm text-slate-900">
              {editingPack ? 'Modifier le Pack' : 'Créer un Nouveau Pack'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre du Pack</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pack Césarienne & Maternité"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {image ? <img src={image} alt="Aperçu du pack" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800">Photo du pack</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">Optimisée automatiquement, maximum 1000 px.</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => void handlePhotoSelected(event.target.files?.[0])} />
                      <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                        {photoBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                        {photoBusy ? 'Envoi…' : image ? 'Remplacer la photo' : 'Choisir dans la galerie'}
                      </button>
                      {image && <button type="button" onClick={() => setImage('')} disabled={photoBusy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"><X className="h-3 w-3" />Retirer</button>}
                    </div>
                  </div>
                </div>
                {photoError && <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-700">{photoError}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Articles inclus dans le kit</label>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input type="search" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Rechercher un produit par nom, catégorie ou variante" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                {matchingProducts.length > 0 && (
                  <div className="mb-3 max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {matchingProducts.map(product => (
                      <button key={product.id} type="button" onClick={() => addProductToPack(product)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-indigo-50">
                        <span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{product.name}</span><span className="text-[10px] text-slate-500">{product.category} · {product.variants[0]?.label || 'Sans variante'}</span></span>
                        <span className="shrink-0 font-mono text-[10px] font-bold text-indigo-700">{(product.variants[0]?.originalPrice ?? product.variants[0]?.price ?? 0).toLocaleString('fr-FR')} FCFA</span>
                      </button>
                    ))}
                  </div>
                )}
                {items.map((it, idx) => (
                  <div key={`${it.productName}-${it.variant || ''}-${idx}`} className="mb-1.5 flex flex-wrap items-center gap-2">
                    <select
                      value={it.productName}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].productName = e.target.value;
                        const selectedProduct = products.find(product => product.name === e.target.value);
                        newItems[idx].variant = selectedProduct?.variants[0]?.label;
                        setItems(newItems);
                      }}
                      className="min-w-[180px] flex-1 rounded-lg border border-slate-300 bg-white p-1.5"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    {(products.find(product => product.name === it.productName)?.variants.length || 0) > 1 && <select value={it.variant || ''} onChange={event => setItems(current => current.map((item, index) => index === idx ? { ...item, variant: event.target.value } : item))} className="max-w-36 rounded-lg border border-slate-300 bg-white p-1.5 text-[11px]">
                      {products.find(product => product.name === it.productName)?.variants.map(variant => <option key={variant.label} value={variant.label}>{variant.label}</option>)}
                    </select>}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={it.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].quantity = Number(e.target.value);
                        setItems(newItems);
                      }}
                      className="w-16 p-1.5 border border-slate-300 rounded-lg text-center font-mono"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="p-1 text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => products[0] && addProductToPack(products[0])}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold text-[11px] mt-1 cursor-pointer"
                >
                  + Ajouter le premier produit du catalogue
                </button>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-indigo-950">Valeur des articles au catalogue</span>
                  <strong className="font-mono text-indigo-900">{packCatalogValue.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                {unpricedItemCount > 0 && <p className="mt-1 text-[10px] text-amber-800">{unpricedItemCount} ligne(s) sont sans prix catalogue ; le total calculé est incomplet.</p>}
                <label className="mt-3 block font-semibold text-slate-700">Prix final du pack (FCFA)
                  <input type="number" min="0" step="1" required value={price} onChange={event => setPrice(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-indigo-200 bg-white p-2.5 font-mono text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
                {packCatalogValue > 0 && price < packCatalogValue && <p className="mt-1 text-[10px] font-semibold text-emerald-700">Économie client : {(packCatalogValue - price).toLocaleString('fr-FR')} FCFA par rapport à la valeur catalogue.</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={photoBusy || items.length === 0}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
