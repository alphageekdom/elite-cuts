export type CatalogPage = {
  /** Total pages for the result set; always at least 1, even when empty. */
  totalPages: number;
  /** Requested page clamped into range — never past the last page. */
  safePage: number;
  /** Documents to skip. Derived from `safePage`, never the raw request. */
  skip: number;
  /** 1-based index of the first item shown; 0 when there are no results. */
  start: number;
  /** 1-based index of the last item shown; 0 when there are no results. */
  end: number;
};

/**
 * Resolves the catalog's page window.
 *
 * The clamp matters: a stale deep link like `?page=999` would otherwise skip
 * past every document and render an empty grid underneath a "Showing 37–39 of
 * 39 cuts" count, because the count reads from the clamped page while the
 * query skipped on the raw one. Deriving `skip` here keeps the two in step.
 */
export function paginateCatalog(
  requestedPage: number,
  total: number,
  pageSize: number,
): CatalogPage {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, requestedPage), totalPages);

  return {
    totalPages,
    safePage,
    skip: (safePage - 1) * pageSize,
    start: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    end: Math.min(safePage * pageSize, total),
  };
}
