import type { PbxVendorFormAdapter } from './types';
import { yeastarP550 } from './yeastar';

/** Registered vendor form adapters. Register future PBX vendors here. */
const registry: ReadonlyMap<string, PbxVendorFormAdapter> = new Map([
  [yeastarP550.id, yeastarP550],
]);

export function vendorAdapter(id: string): PbxVendorFormAdapter | null {
  return registry.get(id) ?? null;
}

export type { PbxVendorFormAdapter, VendorField } from './types';
