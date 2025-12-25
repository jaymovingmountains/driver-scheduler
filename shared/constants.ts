// Van list - predefined vans
export const VAN_LIST = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'Z1', 'Z2', 'Z3', 'Z4', 'Z5',
  'M1'
] as const;

export type VanName = typeof VAN_LIST[number];

// Route types
export const ROUTE_TYPES = {
  regular: { label: 'Regular', color: 'bg-blue-500' },
  'big-box': { label: 'Big Box', color: 'bg-orange-500' },
  'out-of-town': { label: 'Out of Town', color: 'bg-purple-500' },
} as const;

export type RouteType = keyof typeof ROUTE_TYPES;

// Driver status
export const DRIVER_STATUS = {
  active: { label: 'Active', color: 'bg-green-500' },
  inactive: { label: 'Inactive', color: 'bg-gray-500' },
  pending: { label: 'Pending', color: 'bg-yellow-500' },
} as const;

export type DriverStatus = keyof typeof DRIVER_STATUS;
