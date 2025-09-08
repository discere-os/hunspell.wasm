/**
 * WASM-Native Filesystem and Dictionary Management Header for hunspell.wasm
 * 
 * This header defines the WASM-native API for advanced web integration
 * including persistent dictionary storage, async dictionary loading, and CDN support.
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL/GPL/MPL tri-license (same as hunspell)
 */

#ifndef WASM_NATIVE_H
#define WASM_NATIVE_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize WASM-native file system with virtual directories and IDBFS
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_init_filesystem(void);

/**
 * Set persistent storage availability (called from JavaScript after IDBFS sync)
 * @param available: 1 if persistent storage is available, 0 otherwise
 */
void hunspell_native_set_persistent_storage(int available);

/**
 * Load dictionary from URL with intelligent caching
 * 
 * This function implements the WASM-native pattern for async dictionary loading:
 * 1. Check local cache (memory + persistent storage)
 * 2. If cache miss, download asynchronously with emscripten_async_wget
 * 3. Store in cache with automatic management (LRU eviction, size limits)
 * 4. Sync with IndexedDB for persistence across browser sessions
 * 
 * @param aff_url: URL to load AFF (affix) file from
 * @param dic_url: URL to load DIC (dictionary) file from  
 * @param lang_code: Language code for cache key generation (e.g., "en_US")
 * @param callback: Callback function called when loading completes
 * @param user_data: User data passed to callback
 * 
 * Returns: 1 if loading initiated successfully, 0 on error
 * 
 * Callback signature: void callback(const char* aff_path, const char* dic_path, int success, void* user_data)
 * - aff_path: Virtual file system path to AFF file (NULL on failure)
 * - dic_path: Virtual file system path to DIC file (NULL on failure)
 * - success: 1 if successful, 0 if failed
 * - user_data: User data passed to hunspell_native_load_dictionary_from_url
 */
int hunspell_native_load_dictionary_from_url(const char* aff_url, const char* dic_url, const char* lang_code,
                                            void (*callback)(const char* aff_path, const char* dic_path, int success, void* user_data),
                                            void* user_data);

/**
 * Load dictionary package from ZIP archive with caching
 * 
 * Implements intelligent caching for dictionary packages:
 * 1. Generate cache key from package URL and parameters
 * 2. Check cache for previously extracted dictionary files
 * 3. If cache miss, download and extract package
 * 4. Return paths to extracted AFF/DIC files with cache statistics
 * 
 * @param package_url: URL to dictionary package (ZIP format)
 * @param lang_code: Language code for identification
 * @param callback: Callback function for completion notification
 * @param user_data: User data for callback
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_load_dictionary_package(const char* package_url, const char* lang_code,
                                           void (*callback)(const char* aff_path, const char* dic_path, int success, void* user_data),
                                           void* user_data);

/**
 * Create personal dictionary with persistent storage
 * 
 * Creates a personal dictionary that persists across browser sessions
 * using IDBFS storage.
 * 
 * @param dict_name: Name for the personal dictionary
 * @param user_id: Optional user identifier for isolation (can be NULL)
 * 
 * Returns: Dictionary handle (positive integer) or 0 on failure
 */
int hunspell_native_create_personal_dictionary(const char* dict_name, const char* user_id);

/**
 * Add word to personal dictionary with persistence
 * 
 * @param dict_handle: Personal dictionary handle
 * @param word: Word to add
 * @param word_with_affix: Optional affix information (can be NULL)
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_add_personal_word(int dict_handle, const char* word, const char* word_with_affix);

/**
 * Remove word from personal dictionary with persistence
 * 
 * @param dict_handle: Personal dictionary handle
 * @param word: Word to remove
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_remove_personal_word(int dict_handle, const char* word);

/**
 * Sync personal dictionary to persistent storage
 * 
 * @param dict_handle: Personal dictionary handle
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_sync_personal_dictionary(int dict_handle);

/**
 * Load popular dictionaries from CDN providers
 * 
 * Supports loading from well-known CDN sources like:
 * - LibreOffice dictionary repository
 * - Hunspell dictionary collections
 * - Mozilla dictionary repository
 * 
 * @param provider: CDN provider name ("libreoffice", "hunspell", "mozilla")
 * @param lang_code: Language code (e.g., "en_US", "de_DE", "fr_FR")
 * @param callback: Completion callback
 * @param user_data: User data for callback
 * 
 * Returns: 1 if loading initiated, 0 on error
 */
int hunspell_native_load_from_cdn(const char* provider, const char* lang_code,
                                 void (*callback)(const char* aff_path, const char* dic_path, int success, void* user_data),
                                 void* user_data);

/**
 * Enable progressive loading for large dictionaries
 * 
 * Implements streaming dictionary loading for improved startup performance:
 * 1. Load basic word list first (core vocabulary)
 * 2. Stream additional entries asynchronously
 * 3. Provide spell checking during loading with limited functionality
 * 
 * @param enable: 1 to enable progressive loading, 0 to disable
 * @param core_word_limit: Number of core words to load first (default: 10000)
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_set_progressive_loading(int enable, int core_word_limit);

/**
 * Get dictionary loading progress
 * 
 * @param dict_handle: Dictionary handle
 * @param total_words: Pointer to receive total word count (can be NULL)
 * @param loaded_words: Pointer to receive loaded word count (can be NULL)
 * @param is_complete: Pointer to receive completion status (can be NULL)
 * 
 * Returns: Loading percentage (0-100)
 */
int hunspell_native_get_loading_progress(int dict_handle, int* total_words, int* loaded_words, int* is_complete);

/**
 * Get cache statistics
 * 
 * @param entry_count: Pointer to receive number of cached entries (can be NULL)
 * @param total_size: Pointer to receive total cache size in bytes (can be NULL)
 * @param persistent_enabled: Pointer to receive persistent storage status (can be NULL)
 * @param hit_rate: Pointer to receive cache hit rate as percentage (can be NULL)
 */
void hunspell_native_get_cache_stats(int* entry_count, size_t* total_size, 
                                    int* persistent_enabled, int* hit_rate);

/**
 * Configure cache behavior
 * 
 * @param max_entries: Maximum number of cache entries (0 = unlimited)
 * @param max_size_mb: Maximum cache size in megabytes (0 = unlimited)  
 * @param ttl_hours: Time-to-live in hours for cache entries (0 = never expire)
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_configure_cache(int max_entries, int max_size_mb, int ttl_hours);

/**
 * Clear dictionary cache
 * 
 * @param clear_persistent: 1 to also clear persistent storage, 0 for memory only
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_clear_cache(int clear_persistent);

/**
 * Enable/disable offline mode
 * 
 * When enabled, only cached dictionaries are used (no network requests).
 * 
 * @param enable: 1 to enable offline mode, 0 to allow network requests
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_set_offline_mode(int enable);

/**
 * Check if dictionary is available offline
 * 
 * @param lang_code: Language code to check
 * 
 * Returns: 1 if available offline, 0 if requires network
 */
int hunspell_native_is_offline_available(const char* lang_code);

/**
 * Preload dictionaries for offline use
 * 
 * Downloads and caches specified dictionaries for offline availability.
 * 
 * @param lang_codes: Array of language codes to preload
 * @param lang_count: Number of language codes
 * @param progress_callback: Optional progress callback (can be NULL)
 * @param completion_callback: Completion callback  
 * @param user_data: User data for callbacks
 * 
 * Returns: 1 if preloading initiated, 0 on error
 * 
 * Progress callback signature: void callback(const char* lang_code, int progress_percent, void* user_data)
 * Completion callback signature: void callback(int successful_count, int total_count, void* user_data)
 */
int hunspell_native_preload_dictionaries(const char** lang_codes, int lang_count,
                                        void (*progress_callback)(const char* lang_code, int progress_percent, void* user_data),
                                        void (*completion_callback)(int successful_count, int total_count, void* user_data),
                                        void* user_data);

/**
 * Export personal dictionary
 * 
 * @param dict_handle: Personal dictionary handle
 * @param format: Export format ("txt", "dic", "json")
 * @param output_buffer: Buffer to receive exported data
 * @param buffer_size: Size of output buffer
 * 
 * Returns: Number of bytes written to buffer, or negative on error
 */
int hunspell_native_export_personal_dictionary(int dict_handle, const char* format, 
                                              char* output_buffer, size_t buffer_size);

/**
 * Import personal dictionary
 * 
 * @param dict_handle: Personal dictionary handle
 * @param format: Import format ("txt", "dic", "json")
 * @param input_data: Data to import
 * @param data_size: Size of input data
 * 
 * Returns: Number of words imported, or negative on error
 */
int hunspell_native_import_personal_dictionary(int dict_handle, const char* format,
                                             const char* input_data, size_t data_size);

/**
 * Set network timeout for dictionary downloads
 * 
 * @param timeout_ms: Timeout in milliseconds (default: 30000)
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_set_network_timeout(int timeout_ms);

/**
 * Enable/disable compression for network transfers
 * 
 * @param enable: 1 to enable compression, 0 to disable
 * 
 * Returns: 1 on success, 0 on failure
 */
int hunspell_native_set_compression(int enable);

#ifdef __cplusplus
}
#endif

#endif // WASM_NATIVE_H