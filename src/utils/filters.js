import { getNewsPriorityConfig } from '../config.js';

export function matchesRegion(itemRegion, selectedRegions) {
  const regions = Array.isArray(selectedRegions) ? selectedRegions : [selectedRegions];
  if (!regions.length || regions.includes('global')) {
    return true;
  }

  return itemRegion === 'global' || regions.includes(itemRegion);
}

export function matchesAsset(itemAsset, selectedAsset) {
  return selectedAsset === 'all' || itemAsset === selectedAsset || itemAsset === 'all';
}

export function matchesQuery(item, rawQuery) {
  if (!rawQuery) {
    return true;
  }

  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [
    item.title,
    item.summary,
    item.source,
    item.asset,
    item.region,
    item.whyItMatters,
    ...(item.topics || []),
    ...(item.tickers || []),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function sortByPublished(items) {
  return [...items].sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );
}

export function sortByNewsPriority(items) {
  return [...items].sort((left, right) => {
    const scoreDifference = getNewsPriorityScore(right) - getNewsPriorityScore(left);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return getPublishedTime(right) - getPublishedTime(left);
  });
}

export function getNewsPriorityScore(item) {
  const config = getNewsPriorityConfig();
  const publishedAt = getPublishedTime(item);
  const ageHours = publishedAt ? Math.max(0, (Date.now() - publishedAt) / 36e5) : config.freshnessHalfLifeHours;
  const freshnessScore = Math.max(0, 100 - (ageHours / config.freshnessHalfLifeHours) * 50);

  return Math.round(
    freshnessScore +
      getWeight(config.urgencyWeights, item.urgency) +
      getWeight(config.assetWeights, item.asset || item.interest) +
      getWeight(config.regionWeights, item.region) +
      getWeight(config.accessTierWeights, item.accessTier) +
      getSourceWeight(config.sourceWeights, item.source),
  );
}

export function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPublishedTime(item) {
  return new Date(item.publishedAt || item.publishAt || item.originalPublishedAt || 0).getTime() || 0;
}

function getWeight(weights, key) {
  return weights?.[key] || 0;
}

function getSourceWeight(weights, source = '') {
  if (weights?.[source]) {
    return weights[source];
  }

  const normalizedSource = String(source).toLowerCase();
  const match = Object.entries(weights || {}).find(([key]) => normalizedSource.includes(key.toLowerCase()));
  return match?.[1] || 0;
}
