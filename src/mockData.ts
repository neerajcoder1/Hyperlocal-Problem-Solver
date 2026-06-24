import { Issue, CATEGORIES } from './types';

export const INITIAL_ISSUES: Issue[] = [
  {
    id: 'issue-1',
    title: 'Crater-Like Pothole near School Crossing',
    description: 'There is an extremely deep pothole right in front of the primary school crossing gate on Pine Street. Cars are swerving into the oncoming lane to avoid it, which is incredibly dangerous during morning drop-off hours.',
    category: 'Pothole',
    severity: 'Critical',
    location: {
      lat: 40.7259,
      lng: -73.9980,
      address: '142 Pine Street, Near Oakridge School Crossing'
    },
    photos: [],
    status: 'In Progress',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
    aiSuggestions: '⚠️ CITIZEN ALERT: Reduce vehicular speed to under 10 mph. Pedestrians should use the secondary northern crossing. Guard railings are recommended during transit.',
    officialComplaint: `To,\nThe Ward Engineer,\nPublic Works & Highway Safety Division.\n\nSubject: Critical Safety Hazard - Deep Pothole at Oakridge School Crossing (142 Pine St)\n\nDear Officer,\n\nThis letter is to draw your immediate attention to a severe road hazard located at 142 Pine Street, directly adjacent to the active school crossing zone. A crater-like pothole measuring approximately 10 inches deep and 3 feet wide has formed.\n\nOur AI analysis rates this as CRITICAL owing to high risks of: \n1. Pedestrian injury to school children.\n2. Severe tire damage and potential head-on vehicular collisions due to oncoming lane avoidance.\n\nWe request your team to dispatch an emergency asphalt patching truck within 24 hours.\n\nSincerely,\nConcerned Citizen Community & Locally App Response Unit`,
    upvotes: 42
  },
  {
    id: 'issue-2',
    title: 'Illegal Commercial Waste Dump in Alleyway',
    description: 'A large pile of rotting garbage bags, old cardboard crates, and bulk plastic pallets has been dumped behind the local market alleyway. It is blocking fire exit doors and starting to attract stray rodents.',
    category: 'Garbage Accumulation',
    severity: 'High',
    location: {
      lat: 40.7212,
      lng: -74.0030,
      address: 'Back Alley (Behind Supermarket), 89 Mercer Street'
    },
    photos: [],
    status: 'Pending',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
    aiSuggestions: '⚠️ CITIZEN ALERT: Fire exit blocked. Do not attempt to move bulk plastic structures without leather gloves. Clean-up crews required due to rodent presence.',
    officialComplaint: `To,\nThe Health & Sanitation Inspector,\nDepartment of Municipal Cleanliness.\n\nSubject: Urgent Request: Clearing Bulk Trash Dump & Rodent Attracting Waste behind 89 Mercer St\n\nDear Administrator,\n\nWe are filing a complaint regarding an active accumulation of commercial food packages and municipal waste behind the commercial complex at 89 Mercer Street, obstructing a fire exit door.\n\nThis creates a hazardous public sanitary concern and fire safety breach. Please schedule a high-capacity waste disposal crew to restore sidewalk cleanliness.\n\nSincerely,\nLocally Community Council`,
    upvotes: 28
  },
  {
    id: 'issue-3',
    title: 'Broken Streetlight - Complete Dark Zone',
    description: 'Two adjacent overhead streetlights are completely burned out on 5th Avenue. This corner is pitch black at night, making residents feel very unsafe walking home from the transit station.',
    category: 'Broken Streetlight',
    severity: 'Medium',
    location: {
      lat: 40.7280,
      lng: -74.0010,
      address: 'Intersection of 5th Avenue and West 4th Street'
    },
    photos: [],
    status: 'Pending',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(), // 36 hours ago
    aiSuggestions: '🌙 SAFETY TIP: Avoid walking alone after 8 PM in this block. Use a smartphone torch. Keep to the brightly lit storefront side across the road.',
    officialComplaint: `To,\nThe Chief of Electrical & Lighting Operations,\nCity Power Board.\n\nSubject: Notification of Burned out Streetlamps - West 4th & 5th Ave Streetlight Dark Zone\n\nDear Engineering team,\n\nThis is to formally flag the complete failure of two street lighting poles located at the intersection of 5th Avenue and West 4th Street. This dark zone undermines sidewalk visibility and local security.\n\nWe request scheduled maintenance to swap the failed LED bulbs on these poles.\n\nSincerely,\nLocally Safety Team`,
    upvotes: 19
  },
  {
    id: 'issue-4',
    title: 'Water Main Leak Spraying onto Sidewalk',
    description: 'Fresh clean water is bubbling heavily from a crack in the pavement near the water hydrant, spraying a mist onto the sidewalk and causing a major run-off down the gutter. Thousands of gallons are being wasted.',
    category: 'Water Leakage',
    severity: 'High',
    location: {
      lat: 40.7230,
      lng: -73.9950,
      address: 'Sidewalk opposite Park View Plaza, 321 Broadway'
    },
    photos: [],
    status: 'Resolved',
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 days ago
    aiSuggestions: '💧 CITIZEN ALERT: Sidewalk is excessively slippery. Cyclists should avoid the wet gutter patch. Watch for low water pressure in adjacent properties.',
    officialComplaint: `To,\nThe Water Supply & Sewerage Board,\nEmergency Maintenance Dept.\n\nSubject: Major Sidewalk Pavement Water Leakage opposite Park View Plaza\n\nDear Director,\n\nWe wish to report an active, structural water leak bubbling from the sidewalk pavement directly adjacent to the hydrant marker in front of 321 Broadway.\n\nPlease dispatch an emergency valve inspector to arrest the water loss and patch the pipe structure.\n\nSincerely,\nBroadway Neighborhood Block Association`,
    upvotes: 35
  }
];

export const MAP_CENTER = {
  lat: 40.7245,
  lng: -73.9990
};

// Return a list of coordinate pins corresponding to mock neighborhoods
export const MOCK_NEIGHBORHOOD_SPOTS = [
  { name: 'Washington Sq Park Area', lat: 40.7308, lng: -73.9973 },
  { name: 'Lower East Side Corner', lat: 40.7150, lng: -73.9880 },
  { name: 'SoHo Junction', lat: 40.7233, lng: -74.0030 },
  { name: 'East Village Crossing', lat: 40.7265, lng: -73.9815 },
  { name: 'Mercer Square Block', lat: 40.7212, lng: -74.0030 },
  { name: 'Pine Street Crossing', lat: 40.7259, lng: -73.9980 }
];

export function getCategoryColor(category: string) {
  switch (category) {
    case 'Pothole':
      return { bg: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' };
    case 'Garbage Accumulation':
      return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' };
    case 'Broken Streetlight':
      return { bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' };
    case 'Water Leakage':
      return { bg: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' };
    case 'Vandalism & Graffiti':
      return { bg: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' };
    case 'Blocked Drain':
      return { bg: 'bg-teal-100 text-teal-800 border-teal-300', dot: 'bg-teal-500' };
    case 'Stray Animal Hazard':
      return { bg: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' };
    default:
      return { bg: 'bg-gray-100 text-gray-800 border-gray-300', dot: 'bg-gray-500' };
  }
}

export function getSeverityColor(severity: string) {
  switch (severity) {
    case 'Critical':
      return { bg: 'bg-rose-100 text-rose-800 border-rose-300', text: 'text-rose-600', ring: 'ring-rose-500/20' };
    case 'High':
      return { bg: 'bg-orange-100 text-orange-800 border-orange-300', text: 'text-orange-600', ring: 'ring-orange-500/20' };
    case 'Medium':
      return { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: 'text-amber-600', ring: 'ring-amber-500/20' };
    default:
      return { bg: 'bg-sky-100 text-sky-800 border-sky-300', text: 'text-sky-600', ring: 'ring-sky-500/20' };
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'In Progress':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'Resolved':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}
