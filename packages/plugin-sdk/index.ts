/**
 * Plugin Developer SDK - Entry point
 * 
 * Provides the standard interface for AI plugin developers to build
 * compliant plugins that work with the Platform-011/012 ecosystem.
 */

export * from './types/manifest';
export * from './lifecycle/hooks';
export * from './events/emitter';
export * from './permissions/checker';
export * from './metrics/client';
export * from './context';
