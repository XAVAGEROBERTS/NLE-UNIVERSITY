// src/hooks/useCachedData.js
import { useState, useEffect, useCallback } from 'react';
import { dataCache } from '../utils/dataCache';

export const useCachedData = (cacheKey, fetchFunction, options = {}) => {
  const {
    ttl = 5 * 60 * 1000,
    enabled = true,
    dependencies = [],
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        console.log('✅ CACHE HIT for:', cacheKey);
        setData(cachedData);
        setLoading(false);
        setError(null);
        return;
      } else {
        console.log('❌ CACHE MISS for:', cacheKey);
      }
    } else {
      console.log('🔄 FORCE REFRESH for:', cacheKey);
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      dataCache.set(cacheKey, result, ttl);
      console.log('💾 DATA CACHED for:', cacheKey);
      setData(result);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data');
      console.error(`Error fetching ${cacheKey}:`, err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFunction, ttl]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled, ...dependencies]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const clearCache = useCallback(() => {
    dataCache.delete(cacheKey);
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    setData,
  };
};