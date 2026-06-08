import { ofetch } from "ofetch";

import type { SourceFetcher } from "./types";

const CORS_PROXY_URL = "https://corsproxy.io/?url=";

export const directSourceFetcher: SourceFetcher = (url, options) => ofetch(url, options);

export const corsProxySourceFetcher: SourceFetcher = (url, options) =>
  ofetch(`${CORS_PROXY_URL}${encodeURIComponent(url)}`, options);
