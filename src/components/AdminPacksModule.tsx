import React, { useState } from 'react';
import { Layers, Plus, Edit, Trash2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Pack, Product, User } from '../types';
import { logAuditEvent } from '../utils/auditLogger';

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
  const [items, setItems] = useState<{ productName: string; variant?: string; quantity: number }[]>([
    { productName: products[0]?.name || 'Gants d\'examen', quantity: 10 }
  ]);

  const handleOpenCreate = () => {
    setEditingPack(null);
    setTitle('');
    setDescription('');
    setPrice(45000);
    setImage('');
    setItems([{ productName: products[0]?.name || 'Kit médical', quantity: 5 }]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pack: Pack) => {
    setEditingPack(pack);
    setTitle(pack.title);
    setDescription(pack.description);
    setPrice(pack.price);
    setImage(pack.image);
    setItems(pack.items.length > 0 ? pack.items : [{ productName: products[0]?.name || 'Dispositif', quantity: 1 }]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingPack) {
      await onUpdatePack(editingPack.id, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        image: image.trim() || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400',
        items
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
        items,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-3 text-xs">
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prix Global du Pack (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Articles inclus dans le kit</label>
                {items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-1.5">
                    <select
                      value={it.productName}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].productName = e.target.value;
                        setItems(newItems);
                      }}
                      className="flex-1 p-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
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
                  onClick={() => setItems([...items, { productName: products[0]?.name || 'Kit', quantity: 1 }])}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold text-[11px] mt-1 cursor-pointer"
                >
                  + Ajouter un article
                </button>
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer shadow-xs"
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
