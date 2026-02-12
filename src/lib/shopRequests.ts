/**
 * Full request details for body shop view (used in list + detail page).
 * Image URLs: free stock photos of damaged/crashed cars (Pixabay, Unsplash).
 */
export type ShopRequestDetail = {
  id: number;
  vehicle: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  damage: string;
  insuranceValue: number;
  location: string;
  createdAt: string;
  additionalNotes?: string;
  imageLabels: string[];
  imageUrls: string[];
};

// Kazalı araç görselleri (Pixabay - ücretsiz lisans)
// Crash: https://pixabay.com/photos/crash-car-car-crash-accident-1308575/
// Insurance/damage: https://pixabay.com/photos/insurance-damage-repair-checklist-539659/
const PIXABAY_CRASH = "https://cdn.pixabay.com/photo/2016/04/05/01/49/crash-1308575_1280.jpg";
const PIXABAY_DAMAGE = "https://cdn.pixabay.com/photo/2015/02/16/10/54/insurance-539659_1280.jpg";

const damagedCarImages = {
  crash: PIXABAY_CRASH,
  crash2: PIXABAY_CRASH,
  damage: PIXABAY_DAMAGE,
  damagedCar: PIXABAY_CRASH,
  wreck: PIXABAY_CRASH,
  bumper: PIXABAY_DAMAGE,
  dent: PIXABAY_CRASH,
  repair: PIXABAY_DAMAGE,
};

export const shopRequestsDetail: ShopRequestDetail[] = [
  {
    id: 1,
    vehicle: "2022 Toyota Camry",
    make: "Toyota",
    model: "Camry",
    year: "2022",
    vin: "4T1BF1FK5NU123456",
    damage: "Front bumper and headlight damage",
    insuranceValue: 18000,
    location: "New York, NY",
    createdAt: "2024-01-15",
    additionalNotes: "Driver side headlight broken. Bumper has crack and paint damage.",
    imageLabels: ["Front view", "Rear view", "Left side", "Right side", "Damage close-up", "Engine bay"],
    imageUrls: [
      damagedCarImages.crash,
      damagedCarImages.wreck,
      damagedCarImages.damagedCar,
      damagedCarImages.damage,
      damagedCarImages.crash2,
      damagedCarImages.bumper,
    ],
  },
  {
    id: 2,
    vehicle: "2021 Honda Accord",
    make: "Honda",
    model: "Accord",
    year: "2021",
    vin: "1HGCV1F13MA123456",
    damage: "Left door and fender damage",
    insuranceValue: 14000,
    location: "Brooklyn, NY",
    createdAt: "2024-01-17",
    additionalNotes: "Dent on driver door, fender scratch. No structural damage.",
    imageLabels: ["Front view", "Rear view", "Left side (damage)", "Right side", "Damage close-up"],
    imageUrls: [
      damagedCarImages.dent,
      damagedCarImages.damagedCar,
      damagedCarImages.crash,
      damagedCarImages.bumper,
      damagedCarImages.damage,
    ],
  },
  {
    id: 3,
    vehicle: "2020 BMW 3 Series",
    make: "BMW",
    model: "3 Series",
    year: "2020",
    vin: "3MW5R7C05L8B12345",
    damage: "Rear bumper and trunk damage",
    insuranceValue: 22000,
    location: "Queens, NY",
    createdAt: "2024-01-18",
    additionalNotes: "Rear collision. Trunk latch may need adjustment.",
    imageLabels: ["Front view", "Rear view", "Left side", "Right side", "Damage close-up", "Trunk interior", "Rear bumper", "Wheel well"],
    imageUrls: [
      damagedCarImages.crash,
      damagedCarImages.crash2,
      damagedCarImages.wreck,
      damagedCarImages.damagedCar,
      damagedCarImages.damage,
      damagedCarImages.repair,
      damagedCarImages.bumper,
      damagedCarImages.dent,
    ],
  },
  {
    id: 4,
    vehicle: "2019 Mercedes C-Class",
    make: "Mercedes-Benz",
    model: "C-Class",
    year: "2019",
    vin: "55SWF4KB8KU123456",
    damage: "Front bumper, hood and headlight damage",
    insuranceValue: 25000,
    location: "Manhattan, NY",
    createdAt: "2024-01-16",
    additionalNotes: "Hood bent, both headlights. Requesting OEM parts.",
    imageLabels: ["Front view", "Rear view", "Left side", "Right side", "Hood damage", "Headlight", "Engine bay"],
    imageUrls: [
      damagedCarImages.crash2,
      damagedCarImages.damagedCar,
      damagedCarImages.crash,
      damagedCarImages.bumper,
      damagedCarImages.wreck,
      damagedCarImages.damage,
      damagedCarImages.repair,
    ],
  },
];

export function getShopRequestById(id: number): ShopRequestDetail | undefined {
  return shopRequestsDetail.find((r) => r.id === id);
}
