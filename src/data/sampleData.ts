export interface VehicleRecord {
  id: number;
  timestamp: string;
  plate_text: string;
  confidence: number;
  vehicle_type: 'car' | 'van' | 'motorcycle' | 'truck';
  image_path: string;
  speed_estimate?: string;
}

export interface PersonRecord {
  id: number;
  timestamp: string;
  filename: string;
  confidence: number;
  zone: string;
  image_url: string;
}

export const INITIAL_VEHICLES: VehicleRecord[] = [
  {
    id: 1,
    timestamp: '2026-10-25 08:34:12',
    plate_text: '1AB 8245',
    confidence: 0.942,
    vehicle_type: 'car',
    image_path: '/captures/vehicles/vehicle_20261025_083412_1AB8245.jpg',
    speed_estimate: '32 km/h'
  },
  {
    id: 2,
    timestamp: '2026-10-25 08:12:05',
    plate_text: '7AK 3091',
    confidence: 0.915,
    vehicle_type: 'car',
    image_path: '/captures/vehicles/vehicle_20261025_081205_7AK3091.jpg',
    speed_estimate: '28 km/h'
  },
  {
    id: 3,
    timestamp: '2026-10-25 07:48:50',
    plate_text: '2BA 4912',
    confidence: 0.887,
    vehicle_type: 'van',
    image_path: '/captures/vehicles/vehicle_20261025_074850_2BA4912.jpg',
    speed_estimate: '35 km/h'
  },
  {
    id: 4,
    timestamp: '2026-10-25 07:15:22',
    plate_text: '5SA 1089',
    confidence: 0.961,
    vehicle_type: 'car',
    image_path: '/captures/vehicles/vehicle_20261025_071522_5SA1089.jpg',
    speed_estimate: '30 km/h'
  },
  {
    id: 5,
    timestamp: '2026-10-24 18:22:41',
    plate_text: '8B2 9876',
    confidence: 0.934,
    vehicle_type: 'car',
    image_path: '/captures/vehicles/vehicle_20261024_182241_8B29876.jpg',
    speed_estimate: '25 km/h'
  },
  {
    id: 6,
    timestamp: '2026-10-24 16:04:19',
    plate_text: '4M6 1234',
    confidence: 0.892,
    vehicle_type: 'truck',
    image_path: '/captures/vehicles/vehicle_20261024_160419_4M61234.jpg',
    speed_estimate: '22 km/h'
  }
];

export const INITIAL_PERSONS: PersonRecord[] = [
  {
    id: 101,
    timestamp: '2026-10-25 08:41:09',
    filename: 'person_20261025_084109.jpg',
    confidence: 0.94,
    zone: 'GATE_ZONE',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 102,
    timestamp: '2026-10-25 08:15:33',
    filename: 'person_20261025_081533.jpg',
    confidence: 0.91,
    zone: 'GATE_ZONE',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 103,
    timestamp: '2026-10-25 07:55:18',
    filename: 'person_20261025_075518.jpg',
    confidence: 0.88,
    zone: 'GATE_ZONE',
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 104,
    timestamp: '2026-10-24 17:30:45',
    filename: 'person_20261024_173045.jpg',
    confidence: 0.95,
    zone: 'GATE_ZONE',
    image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'
  }
];
