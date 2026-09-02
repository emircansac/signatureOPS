export const CREATE_ITEM_PARAM = "new";
export const CREATE_ITEM_VALUE = "1";

export function withCreateQuery(path: string) {
  return `${path}?${CREATE_ITEM_PARAM}=${CREATE_ITEM_VALUE}`;
}

/** Reads `?new=1` and strips it from the URL. Call only in the browser. */
export function consumeCreateQuery(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get(CREATE_ITEM_PARAM) !== CREATE_ITEM_VALUE) return false;
  url.searchParams.delete(CREATE_ITEM_PARAM);
  const search = url.searchParams.toString();
  window.history.replaceState(null, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
  return true;
}
