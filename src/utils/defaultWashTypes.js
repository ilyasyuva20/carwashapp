export const DEFAULT_WASH_TYPES = [
  {
    id: 1,
    name: 'Full Body Wash',
    pricing: {
      hatchback: 500,
      sedan_compact_suv: 550,
      sedan: 550,
      mini_suv: 550,
      suv: 650,
      premium_hatch: 600,
      premium_sedan_suv: 650,
      muv: 700
    },
    workshop_pricing: {
      hatchback: 400,
      sedan_compact_suv: 450,
      sedan: 450,
      mini_suv: 450,
      suv: 550,
      premium_hatch: 500,
      premium_sedan_suv: 550,
      muv: 600
    }
  },
  {
    id: 2,
    name: 'Body Wash',
    pricing: {
      hatchback: 350,
      sedan_compact_suv: 400,
      sedan: 400,
      mini_suv: 400,
      suv: 500,
      premium_hatch: 400,
      premium_sedan_suv: 500,
      muv: 550
    },
    workshop_pricing: {
      hatchback: 300,
      sedan_compact_suv: 350,
      sedan: 350,
      mini_suv: 350,
      suv: 400,
      premium_hatch: 350,
      premium_sedan_suv: 400,
      muv: 450
    }
  },
  {
    id: 3,
    name: 'Interior & Vacuum',
    pricing: {
      hatchback: 350,
      sedan_compact_suv: 400,
      sedan: 400,
      mini_suv: 400,
      suv: 500,
      premium_hatch: 400,
      premium_sedan_suv: 500,
      muv: 550
    },
    workshop_pricing: {
      hatchback: 300,
      sedan_compact_suv: 350,
      sedan: 350,
      mini_suv: 350,
      suv: 400,
      premium_hatch: 350,
      premium_sedan_suv: 400,
      muv: 450
    }
  },
  {
    id: 4,
    name: 'Water Wash',
    pricing: {
      hatchback: 200,
      sedan_compact_suv: 250,
      sedan: 250,
      mini_suv: 250,
      suv: 350,
      premium_hatch: 250,
      premium_sedan_suv: 350,
      muv: 400
    },
    workshop_pricing: {
      hatchback: 150,
      sedan_compact_suv: 200,
      sedan: 200,
      mini_suv: 200,
      suv: 300,
      premium_hatch: 200,
      premium_sedan_suv: 300,
      muv: 350
    }
  },
  {
    id: 21,
    name: 'Bike / Scooter Wash',
    pricing: {
      bike: 250,
      scooter: 250
    },
    workshop_pricing: {
      bike: 200,
      scooter: 200
    }
  },
  {
    id: 22,
    name: 'Chain Lube',
    pricing: {
      bike: 150
    },
    workshop_pricing: {
      bike: 100
    }
  }
];

export function getPriceForPackage(washType, segment, customerType = 'normal') {
  if (!washType) return 0;
  const pMap = customerType === 'workshop' 
    ? (washType.workshop_pricing || washType.pricing || {}) 
    : (washType.pricing || {});
  
  if (segment && pMap[segment] !== undefined && pMap[segment] !== null) {
    return Number(pMap[segment]);
  }
  
  // Segment aliases & fallbacks
  const segAliases = {
    'sedan': ['sedan_compact_suv', 'mini_suv', 'premium_hatch', 'hatchback'],
    'mini_suv': ['sedan_compact_suv', 'sedan', 'suv', 'hatchback'],
    'sedan_compact_suv': ['sedan', 'mini_suv', 'suv', 'hatchback'],
    'premium_sedan_suv': ['suv', 'muv', 'sedan', 'hatchback'],
    'premium_hatch': ['hatchback', 'sedan'],
    'muv': ['suv', 'premium_sedan_suv', 'sedan', 'hatchback'],
    'suv': ['premium_sedan_suv', 'muv', 'sedan_compact_suv', 'hatchback'],
    'hatchback': ['sedan_compact_suv', 'sedan'],
    'bike': ['scooter'],
    'scooter': ['bike']
  };

  if (segment && segAliases[segment]) {
    for (const alias of segAliases[segment]) {
      if (pMap[alias] !== undefined && pMap[alias] !== null) {
        return Number(pMap[alias]);
      }
    }
  }

  // Fallback to hatchback or first numeric value
  if (pMap.hatchback !== undefined) return Number(pMap.hatchback);
  const values = Object.values(pMap).filter(v => typeof v === 'number');
  if (values.length > 0) return Number(values[0]);
  return 0;
}
