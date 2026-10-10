export interface AreaData {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  aliases?: string[]; // Alternate spellings / local names
}

export const COIMBATORE_AREAS: AreaData[] = [
  // ─── Central Coimbatore ───
  { id: 'gandhipuram', name: 'Gandhipuram', city: 'Coimbatore', latitude: 11.0168, longitude: 76.9558 },
  { id: 'rs-puram', name: 'R.S. Puram', city: 'Coimbatore', latitude: 11.0105, longitude: 76.9456 },
  { id: 'town-hall', name: 'Town Hall', city: 'Coimbatore', latitude: 10.9968, longitude: 76.9608 },
  { id: 'ukkadam', name: 'Ukkadam', city: 'Coimbatore', latitude: 10.9902, longitude: 76.9618 },
  { id: 'race-course', name: 'Race Course', city: 'Coimbatore', latitude: 11.0028, longitude: 76.9680 },
  { id: 'tatabad', name: 'Tatabad', city: 'Coimbatore', latitude: 11.0210, longitude: 76.9630 },
  { id: 'pappanaickenpalayam', name: 'Pappanaickenpalayam', city: 'Coimbatore', latitude: 11.0180, longitude: 76.9820 },
  { id: 'ramanathapuram', name: 'Ramanathapuram', city: 'Coimbatore', latitude: 11.0020, longitude: 76.9880 },
  { id: 'sidhapudur', name: 'Sidhapudur', city: 'Coimbatore', latitude: 11.0130, longitude: 76.9580 },
  { id: 'oppanakara-street', name: 'Oppanakara Street', city: 'Coimbatore', latitude: 11.0030, longitude: 76.9630 },
  { id: 'cross-cut', name: 'Cross Cut Road', city: 'Coimbatore', latitude: 11.0100, longitude: 76.9600 },
  { id: 'puliyakulam', name: 'Puliyakulam', city: 'Coimbatore', latitude: 11.0310, longitude: 76.9720 },

  // ─── East Coimbatore / Avinashi Road Corridor ───
  { id: 'peelamedu', name: 'Peelamedu', city: 'Coimbatore', latitude: 11.0280, longitude: 77.0120 },
  { id: 'hopes-college', name: 'Hopes / Avinashi Road', city: 'Coimbatore', latitude: 11.0255, longitude: 77.0020 },
  { id: 'tidel-park', name: 'Tidel Park / ELCOT', city: 'Coimbatore', latitude: 11.0270, longitude: 77.0270 },
  { id: 'chinniyampalayam', name: 'Chinniyampalayam', city: 'Coimbatore', latitude: 11.0522, longitude: 77.0628 },
  { id: 'neelambur', name: 'Neelambur', city: 'Coimbatore', latitude: 11.0650, longitude: 77.0780 },
  { id: 'irugur', name: 'Irugur', city: 'Coimbatore', latitude: 11.0220, longitude: 77.0720 },
  { id: 'singanallur', name: 'Singanallur', city: 'Coimbatore', latitude: 11.0010, longitude: 77.0260 },
  { id: 'ondipudur', name: 'Ondipudur', city: 'Coimbatore', latitude: 10.9980, longitude: 77.0570 },
  { id: 'sulur', name: 'Sulur', city: 'Coimbatore', latitude: 11.0280, longitude: 77.1260 },
  { id: 'periyanaickenpalayam', name: 'Periyanaickenpalayam', city: 'Coimbatore', latitude: 11.1500, longitude: 76.9600 },
  { id: 'kinathukadavu', name: 'Kinathukadavu', city: 'Coimbatore', latitude: 10.8200, longitude: 77.0100 },
  { id: 'palladam', name: 'Palladam', city: 'Coimbatore', latitude: 10.9920, longitude: 77.2860 },
  { id: 'tirupur', name: 'Tirupur', city: 'Coimbatore', latitude: 11.1085, longitude: 77.3411 },
  { id: 'trichy-road', name: 'Trichy Road', city: 'Coimbatore', latitude: 10.9970, longitude: 77.0180 },
  { id: 'uppilipalayam', name: 'Uppilipalayam', city: 'Coimbatore', latitude: 11.0080, longitude: 77.0100 },

  // ─── North & IT Corridor ───
  { id: 'saravanampatti', name: 'Saravanampatti', city: 'Coimbatore', latitude: 11.0797, longitude: 76.9997 },
  { id: 'kalapatti', name: 'Kalapatti', city: 'Coimbatore', latitude: 11.0718, longitude: 77.0305 },
  { id: 'vilankurichi', name: 'Vilankurichi', city: 'Coimbatore', latitude: 11.0620, longitude: 77.0090 },
  { id: 'ganapathy', name: 'Ganapathy', city: 'Coimbatore', latitude: 11.0360, longitude: 76.9740 },
  { id: 'chinnavedampatti', name: 'Chinnavedampatti', city: 'Coimbatore', latitude: 11.0650, longitude: 76.9820 },
  { id: 'saibaba-colony', name: 'Saibaba Colony', city: 'Coimbatore', latitude: 11.0315, longitude: 76.9425 },
  // Koundampalayam — 3 spelling variants, same place
  { id: 'koundampalayam', name: 'Koundampalayam', city: 'Coimbatore', latitude: 11.0450, longitude: 76.9380, aliases: ['Kavundampalayam', 'Goundanpalayam'] },
  { id: 'thudiyalur', name: 'Thudiyalur', city: 'Coimbatore', latitude: 11.0800, longitude: 76.9380 },
  { id: 'edayarpalayam', name: 'Edayarpalayam', city: 'Coimbatore', latitude: 11.0400, longitude: 76.9150 },
  { id: 'narasimhanaickenpalayam', name: 'Narasimhanaickenpalayam', city: 'Coimbatore', latitude: 11.1100, longitude: 76.9380 },
  { id: 'kanuvai', name: 'Kanuvai', city: 'Coimbatore', latitude: 11.0630, longitude: 76.9050 },
  { id: 'kovilmedu', name: 'Kovilmedu', city: 'Coimbatore', latitude: 11.0260, longitude: 76.9280 },
  { id: 'bilichi', name: 'Bilichi', city: 'Coimbatore', latitude: 11.1600, longitude: 76.9450 },
  { id: 'vellakinar', name: 'Vellakinar', city: 'Coimbatore', latitude: 11.0820, longitude: 76.9620 },
  { id: 'malumichampatti', name: 'Malumichampatti', city: 'Coimbatore', latitude: 10.9140, longitude: 76.9100 },
  { id: 'kuniamuthur', name: 'Kuniamuthur', city: 'Coimbatore', latitude: 10.9580, longitude: 76.9500 },
  { id: 'coimbatore-north', name: 'Coimbatore North', city: 'Coimbatore', latitude: 11.0350, longitude: 76.9550 },

  // ─── West & Perur Corridor ───
  { id: 'vadavalli', name: 'Vadavalli', city: 'Coimbatore', latitude: 11.0240, longitude: 76.9050 },
  { id: 'selvapuram', name: 'Selvapuram', city: 'Coimbatore', latitude: 10.9910, longitude: 76.9350 },
  { id: 'perur', name: 'Perur', city: 'Coimbatore', latitude: 10.9720, longitude: 76.9200 },
  { id: 'thondamuthur', name: 'Thondamuthur', city: 'Coimbatore', latitude: 10.9950, longitude: 76.8320 },
  { id: 'karumathampatti', name: 'Karumathampatti', city: 'Coimbatore', latitude: 11.1370, longitude: 77.0420 },
  { id: 'marudhamalai', name: 'Marudhamalai', city: 'Coimbatore', latitude: 11.0465, longitude: 76.8700 },
  { id: 'pothur', name: 'Pothur', city: 'Coimbatore', latitude: 10.9600, longitude: 76.8900 },
  { id: 'pannimadai', name: 'Pannimadai', city: 'Coimbatore', latitude: 11.0280, longitude: 76.8500 },

  // ─── South & Pollachi/Palakkad Corridor ───
  { id: 'kuniyamuthur', name: 'Kuniyamuthur', city: 'Coimbatore', latitude: 10.9570, longitude: 76.9480 },
  { id: 'kovaipudur', name: 'Kovaipudur', city: 'Coimbatore', latitude: 10.9380, longitude: 76.9400 },
  { id: 'sundarapuram', name: 'Sundarapuram', city: 'Coimbatore', latitude: 10.9510, longitude: 76.9720 },
  { id: 'kurichi', name: 'Kurichi', city: 'Coimbatore', latitude: 10.9450, longitude: 76.9730 },
  { id: 'sidco-industrial', name: 'SIDCO Industrial Estate', city: 'Coimbatore', latitude: 10.9380, longitude: 76.9790 },
  { id: 'podanur', name: 'Podanur', city: 'Coimbatore', latitude: 10.9630, longitude: 76.9850 },
  { id: 'nanjundapuram', name: 'Nanjundapuram', city: 'Coimbatore', latitude: 10.9850, longitude: 76.9930 },
  { id: 'vellalore', name: 'Vellalore', city: 'Coimbatore', latitude: 10.9700, longitude: 77.0120 },
  { id: 'madukkarai', name: 'Madukkarai', city: 'Coimbatore', latitude: 10.9020, longitude: 76.9630 },
  { id: 'othakalmandapam', name: 'Othakalmandapam', city: 'Coimbatore', latitude: 10.8930, longitude: 76.9800 },
  { id: 'chettipalayam', name: 'Chettipalayam', city: 'Coimbatore', latitude: 10.9150, longitude: 77.0320 },
  { id: 'idikarai', name: 'Idikarai', city: 'Coimbatore', latitude: 11.0900, longitude: 76.9350 },
  { id: 'seerapalayam', name: 'Seerapalayam', city: 'Coimbatore', latitude: 10.9350, longitude: 76.9500 },
  { id: 'saravanampatty-south', name: 'Saravanampatti (South)', city: 'Coimbatore', latitude: 11.0700, longitude: 77.0050 },

  // ─── Industrial Areas ───
  { id: 'coimbatore-aerodrome', name: 'Coimbatore Airport Area', city: 'Coimbatore', latitude: 11.0310, longitude: 77.0430 },
  { id: 'sitra-industrial', name: 'SITRA', city: 'Coimbatore', latitude: 10.9990, longitude: 77.0370 },
  { id: 'ganapathypudur', name: 'Ganapathypudur', city: 'Coimbatore', latitude: 11.0340, longitude: 76.9900 },
  { id: 'kavundampalayam-industrial', name: 'KGISL Campus / Saravanampatti IT', city: 'Coimbatore', latitude: 11.0740, longitude: 76.9940 },
  { id: 'coimbatore-junction', name: 'Coimbatore Junction (Railway)', city: 'Coimbatore', latitude: 10.9962, longitude: 76.9676 },

  // ─── Newly Added Localities ───
  { id: 'sowripalayam', name: 'Sowripalayam', city: 'Coimbatore', latitude: 10.9870, longitude: 76.9820 },
  { id: 'varadharajapuram', name: 'Varadharajapuram', city: 'Coimbatore', latitude: 11.0600, longitude: 77.0500 },
  { id: 'thottipalayam', name: 'Thottipalayam', city: 'Coimbatore', latitude: 11.0100, longitude: 76.9750 },
  { id: 'cheran-ma-nagar', name: 'Cheran Ma. Nagar', city: 'Coimbatore', latitude: 11.0450, longitude: 76.9720 },
  { id: 'rathinapuri', name: 'Rathinapuri', city: 'Coimbatore', latitude: 11.0200, longitude: 76.9470 },
  { id: 'ramnagar', name: 'Ram Nagar', city: 'Coimbatore', latitude: 11.0080, longitude: 76.9510 },
  { id: 'goldwins', name: 'Goldwins', city: 'Coimbatore', latitude: 11.0250, longitude: 76.9670 },
  { id: 'palkalai-nagar', name: 'Palkalai Nagar', city: 'Coimbatore', latitude: 11.0220, longitude: 76.9500 },
  { id: 'gandhimanagar', name: 'Gandhi Ma. Nagar / GN Mills', city: 'Coimbatore', latitude: 11.0490, longitude: 76.9530 },
  { id: 'bharathi-nagar', name: 'Bharathi Nagar', city: 'Coimbatore', latitude: 11.0210, longitude: 76.9390 },
  { id: 'neelikonampalayam', name: 'Neelikonampalayam', city: 'Coimbatore', latitude: 11.0950, longitude: 76.9500 },
  { id: 'thoppampatti', name: 'Thoppampatti', city: 'Coimbatore', latitude: 11.0680, longitude: 76.9300 },
  { id: 'velandipalayam', name: 'Velandipalayam', city: 'Coimbatore', latitude: 11.0350, longitude: 76.9320 },
  { id: 'ondipudur-east', name: 'Ondipudur (East)', city: 'Coimbatore', latitude: 10.9990, longitude: 77.0650 },
  { id: 'bommanampalayam', name: 'Bommanampalayam', city: 'Coimbatore', latitude: 11.0460, longitude: 77.0000 },
  { id: 'kuppanapatti', name: 'Kuppanampatti', city: 'Coimbatore', latitude: 11.0980, longitude: 77.0300 },
  { id: 'chikkadasampalayam', name: 'Chikkadasampalayam', city: 'Coimbatore', latitude: 11.0550, longitude: 76.9150 },
  { id: 'theethipalayam', name: 'Theethipalayam', city: 'Coimbatore', latitude: 11.0660, longitude: 76.9470 },
  { id: 'mettupalayam-road', name: 'Mettupalayam Road', city: 'Coimbatore', latitude: 11.0500, longitude: 76.9350 },
  { id: 'nagalingapuram', name: 'Nagalingapuram', city: 'Coimbatore', latitude: 11.0190, longitude: 76.9520 },
  { id: 'kattur', name: 'Kattur', city: 'Coimbatore', latitude: 11.0330, longitude: 76.9360 },
  { id: 'veerapandi', name: 'Veerapandi', city: 'Coimbatore', latitude: 10.9800, longitude: 77.1200 },
  { id: 'zamin-uthukuli', name: 'Zamin Uthukuli', city: 'Coimbatore', latitude: 11.0900, longitude: 77.1500 },
  { id: 'alandurai', name: 'Alandurai', city: 'Coimbatore', latitude: 10.9600, longitude: 76.8450 },
  { id: 'thadagam', name: 'Thadagam', city: 'Coimbatore', latitude: 11.0450, longitude: 76.8700 },
  { id: 'ettimadai', name: 'Ettimadai', city: 'Coimbatore', latitude: 10.7860, longitude: 76.8890 },

  // ─── Outskirts & Satellite Towns ───
  { id: 'annur', name: 'Annur', city: 'Coimbatore', latitude: 11.2330, longitude: 77.1350 },
  { id: 'mettupalayam', name: 'Mettupalayam', city: 'Coimbatore', latitude: 11.2990, longitude: 76.9420 },
  { id: 'pollachi', name: 'Pollachi', city: 'Coimbatore', latitude: 10.6580, longitude: 77.0080 },
  { id: 'valparai', name: 'Valparai', city: 'Coimbatore', latitude: 10.3270, longitude: 76.9520 },
  { id: 'avinashi', name: 'Avinashi', city: 'Coimbatore', latitude: 11.1930, longitude: 77.2680 },
  { id: 'kangeyam', name: 'Kangeyam', city: 'Coimbatore', latitude: 10.9400, longitude: 77.5600 },
  { id: 'udumalpet', name: 'Udumalpet', city: 'Coimbatore', latitude: 10.5835, longitude: 77.2488 },
];

export const OTHER_AREA_ID = 'other_custom';

// Helper: Get area by ID
export const getAreaById = (id: string): AreaData | undefined => {
  if (id === OTHER_AREA_ID) {
    return { id: OTHER_AREA_ID, name: 'Other Area (Custom)', city: 'Coimbatore', latitude: 11.0168, longitude: 76.9558 };
  }
  return COIMBATORE_AREAS.find(a => a.id === id);
};

// Helper: Get area options for react-select (with Other Area option)
export const getAreaSelectOptions = (includeOther: boolean = true) => {
  const options = COIMBATORE_AREAS.map(a => ({ value: a.id, label: a.name }));
  if (includeOther) {
    options.push({ value: OTHER_AREA_ID, label: '➕ Other Area (Type Your Area / Street / Village)' });
  }
  return options;
};

// Map center for Coimbatore
export const COIMBATORE_CENTER: [number, number] = [11.0168, 76.9558];
export const COIMBATORE_ZOOM = 12;
