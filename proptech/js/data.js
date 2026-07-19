/* ============================================================
   PropTech — Verified Rental Listings · Juba, South Sudan
   Demo dataset: listings, agents, neighborhoods.
   User submissions & agent decisions persist in localStorage
   (see app.js). Everything here is illustrative demo data.
   ============================================================ */
(function () {
  "use strict";

  var AGENTS = [
    { id: "AG-01", name: "James Lokudu",  phone: "+211915234801", patch: "Tongpiny · Hai Malakal · Hai Amarat" },
    { id: "AG-02", name: "Sarah Kiden",   phone: "+211915234802", patch: "Nyakuron · Munuki · Gudele" },
    { id: "AG-03", name: "Mary Akech",    phone: "+211915234803", patch: "Kololo · Atlabara · Buluk" },
    { id: "AG-04", name: "Emmanuel Taban",phone: "+211915234804", patch: "Jebel · Sherikat · Gumbo" }
  ];

  var NEIGHBORHOODS = [
    { name: "Tongpiny",          lat: 4.8572, lng: 31.6015 },
    { name: "Juba Na Bari",      lat: 4.8513, lng: 31.6042 },
    { name: "Hai Malakal",       lat: 4.8704, lng: 31.5885 },
    { name: "Kololo",            lat: 4.8624, lng: 31.6203 },
    { name: "Nyakuron",          lat: 4.8356, lng: 31.5853 },
    { name: "Munuki",            lat: 4.8430, lng: 31.5763 },
    { name: "Gudele",            lat: 4.8382, lng: 31.5562 },
    { name: "Atlabara",          lat: 4.8650, lng: 31.6054 },
    { name: "Hai Amarat",        lat: 4.8480, lng: 31.6126 },
    { name: "Jebel",             lat: 4.7962, lng: 31.5602 },
    { name: "Gumbo (East Bank)", lat: 4.8310, lng: 31.6810 },
    { name: "Kator",             lat: 4.8462, lng: 31.5960 },
    { name: "Sherikat",          lat: 4.8022, lng: 31.6312 },
    { name: "Buluk",             lat: 4.8652, lng: 31.6118 },
    { name: "Hai Referendum",    lat: 4.8441, lng: 31.5688 }
  ];

  var LISTINGS = [
    {
      id: "PT-1001",
      title: "Modern 3-bedroom compound house",
      type: "house", listingType: "rent",
      price: 900, beds: 3, baths: 2, size: 240,
      neighborhood: "Tongpiny",
      address: "Off Airport Road, Block 2",
      lat: 4.85718, lng: 31.60151,
      description: "Solid block house inside a full perimeter wall on a quiet side street off Airport Road. Sitting room plus dining, fitted kitchen, en-suite master bedroom, store and outside latrine. Private borehole with 2,000L tank and a 3kVA solar-inverter backup keep water and lights on through load-shedding. Walking distance to Tongpiny market and the ministries.",
      amenities: ["Perimeter wall", "24h askari (guard)", "Private borehole", "Solar backup (3kVA)", "Parking for 2", "Air conditioning", "Water tank 2,000L", "Pets allowed"],
      images: [
        { src: "assets/prop-01.jpg", caption: "Front gate & compound wall", taken: "2026-07-17" },
        { src: "assets/prop-06.jpg", caption: "Sitting room", taken: "2026-07-17" },
        { src: "assets/prop-07.jpg", caption: "Master bedroom", taken: "2026-07-17" }
      ],
      landlord: { name: "A. Maker", phone: "+211915552201" },
      listedAt: "2026-07-14T10:22:00",
      status: "verified",
      verifiedAt: "2026-07-17T15:40:00",
      agent: "James Lokudu", agentPhone: "+211915234801",
      verification: {
        siteVisit: true, gpsMeters: 12, photosDated: true,
        ownerDocs: "Leasehold title sighted & photographed",
        duplicateCheck: true,
        notes: "Agent walked the compound, confirmed borehole flow, solar inverter and room count. Caretaker present; owner joined by video call."
      }
    },
    {
      id: "PT-1002",
      title: "Furnished 2-bedroom apartment",
      type: "apartment", listingType: "rent",
      price: 600, beds: 2, baths: 1, size: 96,
      neighborhood: "Juba Na Bari",
      address: "Plot 14, Juba Na Bari",
      lat: 4.85131, lng: 31.60408,
      description: "Clean furnished apartment on the first floor of a small block in Juba Na Bari. Fridge, cooker, beds, wardrobes and sitting-room set all included — move in with a bag. Shared compound with lockable gate, city water plus reserve tank, and prepaid electricity meter so you control your bill.",
      amenities: ["Furnished", "Prepaid meter", "City water + tank", "Shared compound", "Wi-Fi ready", "First floor", "Near main road"],
      images: [
        { src: "assets/prop-08.jpg", caption: "Open-plan living & kitchen", taken: "2026-07-16" },
        { src: "assets/prop-06.jpg", caption: "Sitting area", taken: "2026-07-16" }
      ],
      landlord: { name: "R. Wani", phone: "+211915552202" },
      listedAt: "2026-07-13T09:05:00",
      status: "verified",
      verifiedAt: "2026-07-16T11:12:00",
      agent: "Sarah Kiden", agentPhone: "+211915234802",
      verification: {
        siteVisit: true, gpsMeters: 8, photosDated: true,
        ownerDocs: "Landlord ID + tenancy agreement template sighted",
        duplicateCheck: true,
        notes: "All furniture photographed item-by-item. Meter number recorded. Agent recommends confirming mattress condition at handover."
      }
    },
    {
      id: "PT-1003",
      title: "Prime 0.5-acre plot, surveyed & beaconed",
      type: "land", listingType: "sale",
      price: 45000, plot: "0.5 acre (≈2,020 m²)",
      neighborhood: "Kololo",
      address: "Kololo Road extension",
      lat: 4.86230, lng: 31.62010,
      description: "Half-acre freehold plot on rising ground in Kololo with an all-weather access road on two sides. Fully surveyed with concrete beacons at every corner — agent re-located each beacon by GPS during verification. Gentle slope, no drainage issues in the rains, and power lines within 200m. Ideal for a family compound or small apartments block.",
      amenities: ["Freehold title", "Concrete beacons", "Two road frontages", "Power within 200m", "Gentle slope", "No wet-season flooding"],
      images: [
        { src: "assets/prop-04.jpg", caption: "Plot from the southern beacon", taken: "2026-07-15" }
      ],
      landlord: { name: "K. Ladu (estate agent of record)", phone: "+211915552203" },
      listedAt: "2026-07-11T14:47:00",
      status: "verified",
      verifiedAt: "2026-07-15T16:55:00",
      agent: "James Lokudu", agentPhone: "+211915234801",
      verification: {
        siteVisit: true, gpsMeters: 21, photosDated: true,
        ownerDocs: "Registered title deed verified against Juba land registry extract",
        duplicateCheck: true,
        notes: "All four beacons found within ±2m of title coordinates. Neighbour confirmed same owner for 9 years. No disputes recorded at the block chief's office."
      }
    },
    {
      id: "PT-1004",
      title: "Spacious 4-bedroom villa with generator",
      type: "house", listingType: "rent",
      price: 1400, beds: 4, baths: 3, size: 380,
      neighborhood: "Hai Malakal",
      address: "Near UNMISS junction, Hai Malakal",
      lat: 4.87030, lng: 31.58870,
      description: "Executive villa in the NGO/UN corridor of Hai Malakal. Four bedrooms (two en-suite), big veranda, mature garden, staff quarters and a covered 25kVA generator with changeover switch. Double-gate entry, razor wire and full-height wall. Previously housed an international organisation — compound meets common UN security guidelines.",
      amenities: ["25kVA generator", "Staff quarters", "Mature garden", "Double gate entry", "UN-mog compliant compound", "Borehole + 5,000L storage", "Air conditioning throughout", "Parking for 4"],
      images: [
        { src: "assets/prop-02.jpg", caption: "Villa frontage & veranda", taken: "2026-07-18" },
        { src: "assets/prop-08.jpg", caption: "Fitted kitchen & dining", taken: "2026-07-18" },
        { src: "assets/prop-07.jpg", caption: "Bedroom 3", taken: "2026-07-18" }
      ],
      landlord: { name: "M. Nyandeng", phone: "+211915552204" },
      listedAt: "2026-07-15T08:31:00",
      status: "verified",
      verifiedAt: "2026-07-18T10:26:00",
      agent: "Mary Akech", agentPhone: "+211915234803",
      verification: {
        siteVisit: true, gpsMeters: 9, photosDated: true,
        ownerDocs: "Power of attorney + title copy on file",
        duplicateCheck: true,
        notes: "Generator test-run for 20 minutes, changeover working. Water pressure good on borehole pump. Wall height measured 2.4m all round."
      }
    },
    {
      id: "PT-1005",
      title: "1-bedroom studio near University of Juba",
      type: "room", listingType: "rent",
      price: 220, beds: 1, baths: 1, size: 38,
      neighborhood: "Nyakuron",
      address: "Nyakuron West, off University Rd",
      lat: 4.83550, lng: 31.58520,
      description: "Self-contained studio a 7-minute walk from the University of Juba main gate — popular with staff and postgrad students. Own entrance, inside shower and toilet, kitchenette counter, ceiling fan and prepaid meter. Wall-mounted reading lights and a small veranda facing the shared courtyard.",
      amenities: ["Own entrance", "Inside shower/toilet", "Prepaid meter", "Ceiling fan", "7 min to University", "Shared courtyard"],
      images: [
        { src: "assets/prop-07.jpg", caption: "Studio bed & wardrobe wall", taken: "2026-07-12" }
      ],
      landlord: { name: "S. Loro", phone: "+211915552205" },
      listedAt: "2026-07-09T17:12:00",
      status: "verified",
      verifiedAt: "2026-07-12T09:48:00",
      agent: "Sarah Kiden", agentPhone: "+211915234802",
      verification: {
        siteVisit: true, gpsMeters: 18, photosDated: true,
        ownerDocs: "Landlord ID sighted",
        duplicateCheck: true,
        notes: "Walked the route to the university gate — 650m. Meter prepaid and active. Roof inspected from inside; no leak staining."
      }
    },
    {
      id: "PT-1006",
      title: "Commercial shop unit, market frontage",
      type: "commercial", listingType: "rent",
      price: 350, plot: null, size: 55,
      neighborhood: "Kator",
      address: "Kator market road, Unit 7",
      lat: 4.84610, lng: 31.59620,
      description: "Lock-up shop on the busy Kator market road with roller shutter, storage back-room and dedicated power point. Foot traffic all day; boda stage 30m away. Suits electronics, agro-inputs, pharmacy or money services. Previous tenant (tailor) relocated after 3 years — unit is clean and freshly painted.",
      amenities: ["Roller shutter", "Back store", "Dedicated power point", "Market foot traffic", "Fresh paint", "Signage space"],
      images: [
        { src: "assets/prop-03.jpg", caption: "Street frontage, Unit 7 (ground floor)", taken: "2026-07-13" }
      ],
      landlord: { name: "J. Kenyi", phone: "+211915552206" },
      listedAt: "2026-07-10T11:38:00",
      status: "verified",
      verifiedAt: "2026-07-13T13:20:00",
      agent: "James Lokudu", agentPhone: "+211915234801",
      verification: {
        siteVisit: true, gpsMeters: 14, photosDated: true,
        ownerDocs: "Shop allocation letter from market association sighted",
        duplicateCheck: true,
        notes: "Shutter serviced and locking smoothly. Confirmed unit number with market association chairperson. Rainy-season roof repair completed June 2026."
      }
    },
    {
      id: "PT-1007",
      title: "1-acre land on Jebel Road, 49-year lease",
      type: "land", listingType: "sale",
      price: 28000, plot: "1 acre (≈4,050 m²)",
      neighborhood: "Jebel",
      address: "Jebel Road, km 6",
      lat: 4.79610, lng: 31.56040,
      description: "Full acre of flat, dry land 6km out on Jebel Road with a 49-year registered lease (renewable). Red murram road runs along the eastern boundary; mains power planned along the same corridor. Scattered mature mango and acacia trees — keep them for shade or clear selectively for building. Strong pick for a school, church, or satelite town homes.",
      amenities: ["49-year registered lease", "Road frontage", "Flat & dry", "Mature trees", "Planned power corridor", "No known disputes"],
      images: [
        { src: "assets/prop-09.jpg", caption: "Across the plot toward Jebel Kujur", taken: "2026-07-14" }
      ],
      landlord: { name: "D. Yasin", phone: "+211915552207" },
      listedAt: "2026-07-08T09:14:00",
      status: "verified",
      verifiedAt: "2026-07-14T15:02:00",
      agent: "Emmanuel Taban", agentPhone: "+211915234804",
      verification: {
        siteVisit: true, gpsMeters: 26, photosDated: true,
        ownerDocs: "Lease certificate sighted; registry line checked",
        duplicateCheck: true,
        notes: "Agent paced all four boundaries, photographed lease certificate with owner present. Adjacent farmer confirms quiet tenure since 2019."
      }
    },
    {
      id: "PT-1008",
      title: "2-bedroom bungalow with garden",
      type: "house", listingType: "rent",
      price: 380, beds: 2, baths: 1, size: 110,
      neighborhood: "Gudele",
      address: "Gudele Block 4, Street 9",
      lat: 4.83810, lng: 31.55640,
      description: "Friendly bungalow in a settled part of Gudele Block 4. Two decent bedrooms, inside bathroom, shaded veranda and a real garden with papaya and sukuma beds already growing. Compound shared with one other small house; borehole is 80m away, with a 1,000L roof-harvested tank for the rains.",
      amenities: ["Garden with fruit trees", "Shaded veranda", "Water tank 1,000L", "Quiet block", "Shared compound (2 houses)", "Iron-sheet roof, good condition"],
      images: [
        { src: "assets/prop-05.jpg", caption: "Bungalow & garden gate", taken: "2026-07-11" },
        { src: "assets/prop-06.jpg", caption: "Sitting room", taken: "2026-07-11" }
      ],
      landlord: { name: "T. Achuil", phone: "+211915552208" },
      listedAt: "2026-07-07T15:55:00",
      status: "verified",
      verifiedAt: "2026-07-11T10:15:00",
      agent: "Sarah Kiden", agentPhone: "+211915234802",
      verification: {
        siteVisit: true, gpsMeters: 11, photosDated: true,
        ownerDocs: "Landlord ID + chief's allocation paper sighted",
        duplicateCheck: true,
        notes: "Roof sheets tight, gables sound. Neighbour on both sides confirms landlord and no dispute history. Water point queue ~10 min at 7am."
      }
    },
    {
      id: "PT-1009",
      title: "New 3-bedroom apartment in serviced block",
      type: "apartment", listingType: "rent",
      price: 750, beds: 3, baths: 2, size: 120,
      neighborhood: "Atlabara",
      address: "Atlabara C, Block 6",
      lat: 4.86510, lng: 31.60520,
      description: "Never-lived-in apartment in a freshly finished block in Atlabara. Three bedrooms, two bathrooms, balcony off the sitting room, and ground-floor parking inside the gate. Block has a shared borehole, communal generator evenings 6–11pm, and a caretaker on site. Ground-floor convenience store opening next month.",
      amenities: ["Brand new", "Balcony", "Borehole (shared)", "Evening generator", "On-site caretaker", "Gated parking"],
      images: [
        { src: "assets/prop-03.jpg", caption: "Apartment block exterior", taken: "2026-07-10" },
        { src: "assets/prop-08.jpg", caption: "Kitchen & dining (show unit)", taken: "2026-07-10" }
      ],
      landlord: { name: "Habiba Properties Ltd", phone: "+211915552209" },
      listedAt: "2026-07-06T12:44:00",
      status: "verified",
      verifiedAt: "2026-07-10T16:31:00",
      agent: "Mary Akech", agentPhone: "+211915234803",
      verification: {
        siteVisit: true, gpsMeters: 13, photosDated: true,
        ownerDocs: "Company registration + block occupancy permit sighted",
        duplicateCheck: true,
        notes: "Agent inspected the actual unit (not only show unit). Taps run, cisterns flush, balcony rails solid. Snag list (2 items) shared with landlord."
      }
    },
    {
      id: "PT-1010",
      title: "Serviced guest wing, NGO corridor",
      type: "apartment", listingType: "rent",
      price: 1100, beds: 3, baths: 2, size: 160,
      neighborhood: "Hai Amarat",
      address: "Hai Amarat, behind the ministries",
      lat: 4.84790, lng: 31.61280,
      description: "Private wing of a diplomatic-zone compound, fully serviced: cleaning 5 days a week, laundry twice a week, Wi-Fi included, and full backup power. Three rooms (or two plus office), small private garden seating area, and use of compound's vehicle gate. Popular with consultants on 3–12 month contracts — references from two previous INGO tenants available.",
      amenities: ["Fully serviced", "Wi-Fi included", "Cleaning 5×/week", "Full backup power", "Private garden seat", "INGO references", "Use of vehicle gate"],
      images: [
        { src: "assets/prop-02.jpg", caption: "Compound the wing belongs to", taken: "2026-07-09" },
        { src: "assets/prop-06.jpg", caption: "Wing sitting room", taken: "2026-07-09" }
      ],
      landlord: { name: "E. Khamis", phone: "+211915552210" },
      listedAt: "2026-07-05T10:03:00",
      status: "verified",
      verifiedAt: "2026-07-09T14:11:00",
      agent: "James Lokudu", agentPhone: "+211915234801",
      verification: {
        siteVisit: true, gpsMeters: 7, photosDated: true,
        ownerDocs: "Title + landlord ID on file",
        duplicateCheck: true,
        notes: "Spoke with one previous tenant (UN agency logistics officer) by phone — confirmed service standard and deposit returned in full."
      }
    },
    {
      id: "PT-1011",
      title: "Corner quarter-acre, East Bank growth zone",
      type: "land", listingType: "sale",
      price: 15000, plot: "0.25 acre (≈1,010 m²)",
      neighborhood: "Gumbo (East Bank)",
      address: "Gumbo-Shirkat road, corner plot",
      lat: 4.83110, lng: 31.68130,
      description: "Corner quarter-acre in fast-growing Gumbo on the East Bank — priced for a quick sale. Community-title land: ownership attested by the boma chief and two neighbours, all photographed with the seller during our visit (letter on file). Corner position gives two street frontages; the Gumbo market and Juba bridge are both within 15 minutes.",
      amenities: ["Chief-attested community title", "Corner plot, 2 frontages", "15 min to Gumbo market", "Growing area", "Priced for quick sale"],
      images: [
        { src: "assets/prop-09.jpg", caption: "Plot & access track", taken: "2026-07-08" }
      ],
      landlord: { name: "P. Modi", phone: "+211915552211" },
      listedAt: "2026-07-04T13:29:00",
      status: "verified",
      verifiedAt: "2026-07-08T11:47:00",
      agent: "Emmanuel Taban", agentPhone: "+211915234804",
      verification: {
        siteVisit: true, gpsMeters: 33, photosDated: true,
        ownerDocs: "Chief's attestation letter + 2 neighbour confirmations (photos on file)",
        duplicateCheck: true,
        notes: "Community land — PropTech lists chief-attested parcels only, no registry title exists yet for this block. Buyer advised to re-attest at transfer; fee guidance in dashboard."
      }
    },
    {
      id: "PT-1012",
      title: "Self-contained room, shared compound",
      type: "room", listingType: "rent",
      price: 120, beds: 1, baths: 1, size: 22,
      neighborhood: "Munuki",
      address: "Munuki Block B, Plot 31",
      lat: 4.84310, lng: 31.57620,
      description: "Simple self-contained room in a friendly Munuki compound — own door, own shower, shared courtyard tap and charcoal kitchen area. Landlady lives on the plot; compound is calm, locked at 10pm. 5 minutes to the Munuki market and right on the Jebel boda route.",
      amenities: ["Own entrance", "Inside shower", "Lockable compound", "Landlady on-site", "5 min to market", "Boda route"],
      images: [
        { src: "assets/prop-07.jpg", caption: "Room with net & wardrobe", taken: "2026-07-16" }
      ],
      landlord: { name: "M. Joyce", phone: "+211915552212" },
      listedAt: "2026-07-12T08:20:00",
      status: "verified",
      verifiedAt: "2026-07-16T09:05:00",
      agent: "Sarah Kiden", agentPhone: "+211915234802",
      verification: {
        siteVisit: true, gpsMeters: 16, photosDated: true,
        ownerDocs: "Landlady ID sighted",
        duplicateCheck: true,
        notes: "Door locks solid, window screens intact. Verified curfew arrangement with landlady in person. Good first rental for a single professional."
      }
    }
  ];

  /* Items sitting in the agent review queue (demo "fresh submissions").
     `claimed` = what the owner typed; `captured` = the agent's GPS on site. */
  var SEED_PENDING = [
    {
      id: "PT-Q201", seed: true,
      title: "3-bedroom house — owner abroad, caretaker on site",
      type: "house", listingType: "rent",
      price: 500, beds: 3, baths: 2, size: 180,
      neighborhood: "Hai Referendum",
      address: "Hai Referendum, Plot 88",
      submittedAt: "2026-07-18T09:24:00",
      landlord: { name: "Deng M. (via WhatsApp)", phone: "+211922456789" },
      claimed: { lat: 4.84402, lng: 31.56903 },
      captured: { lat: 4.84371, lng: 31.56882, accuracy: 9 },
      photos: ["assets/prop-05.jpg", "assets/prop-06.jpg", "assets/prop-07.jpg"],
      note: "Caretaker let the agent in. Owner is in Kampala; ID and allocation paper sent over WhatsApp. Everything looked consistent during the visit.",
      source: "WhatsApp"
    },
    {
      id: "PT-Q202", seed: true,
      title: "Half-acre plot — coordinates need a second look",
      type: "land", listingType: "sale",
      price: 19000, plot: "0.5 acre",
      neighborhood: "Sherikat",
      address: "Sherikat, near the airstrip road",
      submittedAt: "2026-07-19T07:51:00",
      landlord: { name: "L. Pitia", phone: "+211922112233" },
      claimed: { lat: 4.80200, lng: 31.63110 },
      captured: { lat: 4.81180, lng: 31.64500, accuracy: 12 },
      photos: ["assets/prop-09.jpg", "assets/prop-04.jpg"],
      note: "The pin the owner dropped and where the agent physically stood are ~1.6km apart. Could be an honest map-slip — or could be a different plot than advertised. Needs owner confirmation before any badge.",
      source: "Web form"
    },
    {
      id: "PT-Q203", seed: true,
      title: "1-bedroom apartment, first floor",
      type: "apartment", listingType: "rent",
      price: 300, beds: 1, baths: 1, size: 48,
      neighborhood: "Buluk",
      address: "Buluk, Block 3",
      submittedAt: "2026-07-17T14:02:00",
      landlord: { name: "N. Ajo", phone: "+211922778899" },
      claimed: { lat: 4.86500, lng: 31.61200 },
      captured: { lat: 4.86510, lng: 31.61190, accuracy: 7 },
      photos: ["assets/prop-08.jpg", "assets/prop-07.jpg", "assets/prop-06.jpg"],
      note: "Straightforward verification. Owner present, ID matches allocation letter, rooms as described, water running.",
      source: "Web form"
    }
  ];

  window.PT_DATA = {
    AGENTS: AGENTS,
    NEIGHBORHOODS: NEIGHBORHOODS,
    LISTINGS: LISTINGS,
    SEED_PENDING: SEED_PENDING
  };
})();
