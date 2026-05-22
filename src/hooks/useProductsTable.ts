'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ProductCategory } from '@/lib/admin-constants';
import type { ProductTableRow } from '@/types/admin';
import { useAdminDrawer } from './useAdminDrawer';

// Owns the product list state, the row-level detail drawer, the row-actions
// menu state, every single-row mutation, and the bulk-action state machine
// (price-edit mode, in-flight label, and delete) that ProductsClient.tsx
// fires. The component keeps purely visual state — search, sort, page,
// per-page, the category filter, the import drawer, and the stat-strip
// filter key — and renders what this hook returns.

export function useProductsTable(initialProducts: ProductTableRow[]) {
  const [products, setProducts] = useState(initialProducts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState('');
  const drawer = useAdminDrawer<ProductTableRow>();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(rows: ProductTableRow[]) {
    setSelectedIds(new Set(rows.map((r) => r.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function save(fd: FormData, id?: string): Promise<boolean> {
    try {
      const res = await fetch(id ? `/api/products/${id}` : '/api/products', {
        method: id ? 'PUT' : 'POST',
        body: fd,
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to save product');
        return false;
      }
      const { data } = await res.json();
      const now = new Date().toISOString();
      const cat = fd.get('category') as ProductCategory;
      // Backcompat optimistic price — the model's pre-validate hook stamps
      // this server-side from the canonical pricing field. Mirror the pick
      // here so the row doesn't flash $0.00 before the next refresh.
      const optimisticPrice = (() => {
        const t = fd.get('pricingType');
        const n = (key: string) => Number(fd.get(key)) || 0;
        if (t === 'fixed_package') return n('packagePrice');
        if (t === 'per_lb' || t === 'whole_item_by_weight') return n('pricePerLb');
        if (t === 'each') return n('unitPrice');
        if (t === 'bundle') return n('bundlePrice');
        return 0;
      })();
      if (id) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: fd.get('name') as string,
                  category: cat,
                  price: optimisticPrice,
                  stockCount: Number(fd.get('stock') ?? fd.get('stockCount')),
                  updatedAt: now,
                }
              : p,
          ),
        );
        toast.success('Product updated');
      } else {
        setProducts((prev) => [
          {
            id: data.id as string,
            name: fd.get('name') as string,
            category: cat,
            price: optimisticPrice,
            stockCount: Number(fd.get('stock') ?? fd.get('stockCount')),
            images: [],
            isFeatured: false,
            isActive: true,
            isAged: false,
            isNewArrival: true,
            rating: 0,
            createdAt: now,
            updatedAt: now,
          },
          ...prev,
        ]);
        toast.success('Product created');
      }
      return true;
    } catch {
      toast.error('Failed to save product');
      return false;
    }
  }

  async function archive(id: string) {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to archive product');
        return;
      }
      setOpenMenuId(null);
      toast.success('Product archived');
    } catch {
      toast.error('Failed to archive product');
    }
  }

  async function duplicate(product: ProductTableRow) {
    // Legacy rows from pre-Phase-1 data have no pricingType — the admin
    // form treats those as "must pick one before saving", and we can't
    // construct a valid duplicate without it.
    if (!product.pricingType) {
      toast.error('Open this product and pick a pricing model before duplicating');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('name', `${product.name} (Copy)`);
      fd.append('description', product.description ?? '');
      fd.append('category', product.category);
      fd.append('cutType', product.cutType ?? '');
      fd.append('qualityTier', product.qualityTier ?? 'standard');
      fd.append('pricingType', product.pricingType);

      // Carry every per-type pricing field the source has — the schema's
      // superRefine only enforces the ones that match the active type,
      // but a future re-edit (admin switches type) is best off seeing the
      // source's values rather than starting empty.
      const numericFields: Array<keyof ProductTableRow> = [
        'packagePrice', 'packageWeightLb',
        'pricePerLb', 'estimatedWeightLb', 'averageWeightLb',
        'minWeightLb', 'maxWeightLb',
        'unitPrice', 'bundlePrice',
      ];
      for (const key of numericFields) {
        const value = product[key];
        if (typeof value === 'number') fd.append(String(key), String(value));
      }

      if (product.includedItems?.length) {
        fd.append('includedItems', product.includedItems.join('|'));
      }

      // Carry SKU/grade/supplier so the new draft reads as a real cut, but
      // leave par/reorder unset so the admin reviews them for the new SKU.
      if (product.sku) fd.append('sku', `${product.sku}-COPY`);
      if (product.gradeBreed) fd.append('gradeBreed', product.gradeBreed);
      if (product.supplier) fd.append('supplier', product.supplier);

      // New copies always start unstocked and unpublished — the admin
      // reviews them before going live.
      fd.append('stock', '0');
      fd.append('isActive', 'false');
      fd.append('isFeatured', 'false');
      fd.append('isAged', product.isAged ? 'true' : 'false');
      fd.append('isNewArrival', 'true');

      const res = await fetch('/api/products', { method: 'POST', body: fd });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to duplicate product');
        return;
      }
      const { data } = await res.json();
      const now = new Date().toISOString();
      setProducts((prev) => [
        {
          ...product,
          id: data.id as string,
          name: `${product.name} (Copy)`,
          stockCount: 0,
          isActive: false,
          isFeatured: false,
          isNewArrival: true,
          images: [],
          createdAt: now,
          updatedAt: now,
        },
        ...prev,
      ]);
      setOpenMenuId(null);
      toast.success('Product duplicated');
    } catch {
      toast.error('Failed to duplicate product');
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to delete product');
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setOpenMenuId(null);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  }

  async function bulkPatch(body: Record<string, unknown>, label: string) {
    const ids = [...selectedIds];
    setBulkLoading(label);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        ),
      );
      clearSelection();
      toast.success(`${ids.length} product${ids.length !== 1 ? 's' : ''} updated`);
    } catch {
      toast.error('Failed to update some products');
    } finally {
      setBulkLoading('');
    }
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    setBulkLoading('delete');
    try {
      await Promise.all(ids.map((id) => fetch(`/api/products/${id}`, { method: 'DELETE' })));
      setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      clearSelection();
      toast.success(`${ids.length} product${ids.length !== 1 ? 's' : ''} deleted`);
    } catch {
      toast.error('Failed to delete some products');
    } finally {
      setBulkLoading('');
    }
  }

  return {
    products,
    drawer,
    selectedIds,
    openMenuId,
    setOpenMenuId,
    toggleSelect,
    selectAll,
    clearSelection,
    save,
    archive,
    duplicate,
    remove,
    bulk: {
      loading: bulkLoading,
      patch: bulkPatch,
      remove: bulkDelete,
    },
  };
}
