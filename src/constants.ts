/** Minimum size of a ZIP Local File Header in bytes */
export const MIN_LOCAL_HEADER_SIZE = 30;

/** Minimum size of a ZIP Central Directory File Header in bytes */
export const MIN_CDFH_SIZE = 46;

/** Minimum size of the End of Central Directory record in bytes */
export const EOCD_MIN_SIZE = 22;

/** ZIP format signature for Central Directory File Header */
export const CENTRAL_DIR_HEADER = 0x02014b50;

/** ZIP format signature for End of Central Directory record */
export const EOCD_SIGNATURE = 0x06054b50;

/** Default number of concurrent file extractions */
export const DEFAULT_CONCURRENCY = 10;

/** ZIP compression method: No compression (stored) */
export const STORE = 0;

/** ZIP compression method: DEFLATE compression */
export const DEFLATE = 8;
