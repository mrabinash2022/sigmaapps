export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export function parsePagination(req, { defaultLimit = DEFAULT_PAGE_LIMIT, maxLimit = MAX_PAGE_LIMIT } = {}) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse(items, { total, page, limit }) {
  return {
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}
