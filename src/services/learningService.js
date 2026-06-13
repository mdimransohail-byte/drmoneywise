import { canAccess, getPlanConfig } from '../config.js';
import { learningTracks } from '../data/learningTracks.js';

export function getLearningTracks({ asset = 'all', experience = 'intermediate', tier = 'free' } = {}) {
  const plan = getPlanConfig(tier);

  return learningTracks
    .filter((track) => asset === 'all' || track.asset === asset || track.asset === 'all')
    .filter((track) => experience === 'advanced' || track.experience === experience || track.experience === 'beginner')
    .map((track) => ({
      ...track,
      accessTier: track.accessTier || 'free',
      accessible: canAccess(plan, track.accessTier || 'free'),
    }));
}
