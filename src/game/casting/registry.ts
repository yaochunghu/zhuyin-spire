import type {
  CastingGateId,
  CastingGateProvider,
  CastingPrompt,
  CastingPromptContext,
} from './types';
import { mathProvider } from './math/provider';
import { zhuyinProvider } from './zhuyinProvider';

export interface CastingGateRegistry {
  get(id: CastingGateId): CastingGateProvider;
  ids(): CastingGateId[];
}

export function createCastingGateRegistry(
  providers: readonly CastingGateProvider[],
): CastingGateRegistry {
  const providersById = new Map<CastingGateId, CastingGateProvider>();
  for (const provider of providers) {
    if (providersById.has(provider.id)) {
      throw new Error(`Casting gate ${provider.id} is already registered`);
    }
    providersById.set(provider.id, provider);
  }
  return {
    get(id: CastingGateId): CastingGateProvider {
      const provider = providersById.get(id);
      if (!provider) throw new Error(`Casting gate ${id} is not implemented yet`);
      return provider;
    },
    ids(): CastingGateId[] {
      return [...providersById.keys()];
    },
  };
}

/** The game installs 注音 and 珠算. Tests build their own registry for a stub task. */
const gameRegistry = createCastingGateRegistry([zhuyinProvider, mathProvider]);

export function getGameCastingRegistry(): CastingGateRegistry {
  return gameRegistry;
}

export function getCastingGateProvider(id: CastingGateId): CastingGateProvider {
  return gameRegistry.get(id);
}

export function listRegisteredCastingGates(): readonly CastingGateId[] {
  return gameRegistry.ids();
}

export function createCastingPrompt(
  registry: CastingGateRegistry,
  context: CastingPromptContext,
): CastingPrompt {
  return registry.get(context.binding.gateId).createPrompt(context);
}
