import type { CastingGateId, CastingGateProvider } from './types';
import { zhuyinProvider } from './zhuyinProvider';

const PROVIDERS: Partial<Record<CastingGateId, CastingGateProvider>> = {
  zhuyin: zhuyinProvider,
};

export function getCastingGateProvider(id: CastingGateId): CastingGateProvider {
  const provider = PROVIDERS[id];
  if (!provider) throw new Error(`Casting gate ${id} is not implemented yet`);
  return provider;
}
