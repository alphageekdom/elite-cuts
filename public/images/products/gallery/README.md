# Featured-cut gallery images

Extra product shots that feed the thumbnail gallery strip on the product
detail page. Only the **7 featured cuts** get a gallery — every other product
carries a single image and renders exactly as before (the strip hides itself
at ≤1 image).

Primaries stay where they are (`public/images/products/<file>.jpg`, referenced
in the seed by bare filename). The *additional* shots live here and are
referenced in the seed by full path, e.g. `/images/products/gallery/beef-ribeye-dry-aged-2.jpg`
— `productImageSrc()` passes any leading-slash path straight through.

## The 7 featured cuts and their primary basename

| Product                   | Primary basename         |
| ------------------------- | ------------------------ |
| Ground Beef Pack (80/20)  | `beef-ground-chuck`      |
| Dry-Aged Ribeye           | `beef-ribeye-dry-aged`   |
| Tomahawk                  | `beef-tomahawk`          |
| Whole Chicken             | `chicken-whole`          |
| Lamb Loin Chops           | `lamb-loin-chops`        |
| Prosciutto di Parma       | `charcuterie-prosciutto` |
| Beef Sampler              | `bundles-beef-sampler`   |

## Naming convention

Additional shots are the primary basename plus a `-2`, `-3`, `-4` suffix, so a
cut's images sort in order:

```
beef-ribeye-dry-aged-2.jpg
beef-ribeye-dry-aged-3.jpg
beef-ribeye-dry-aged-4.jpg
```

## Per-batch workflow (agreed sequencing — one featured cut at a time)

1. Generate the ~3 extra shots with the supplied prompt; save them here using
   the naming convention above.
2. Append them to that product's `images` array **in the seed**
   (`src/lib/demo/seed/products.ts`) after the existing primary:
   ```ts
   images: [
     'beef-ribeye-dry-aged.jpg',
     '/images/products/gallery/beef-ribeye-dry-aged-2.jpg',
     '/images/products/gallery/beef-ribeye-dry-aged-3.jpg',
     '/images/products/gallery/beef-ribeye-dry-aged-4.jpg',
   ],
   ```
   The seed is the source of truth — the nightly demo reset wipes and re-creates
   the catalog, so anything not in the seed is gone by morning.
3. Re-seed, then confirm the gallery appears on that cut and nowhere else.
