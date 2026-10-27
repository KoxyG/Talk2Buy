// Made-up shops and products for building and testing before the Choppaddi API is connected.
// Names and prices are realistic but not real. Shops span several Nigerian cities; Asaba and
// Enugu carry the most products because eval/requests.jsonl uses them, and cover every eval item.

import type { Day, Product, Shop } from "../types";

// Sample-only: real stores report their own ETAs.
export type SampleShop = Shop & { deliveryMinutes: number };

const days: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const daily = (open: string, close: string) =>
  Object.fromEntries(days.map((d) => [d, [open, close]])) as Shop["openingHours"];

const shop = (id: string, name: string, type: Shop["type"], area: string, open: string, close: string, prep: number, delivery: number): SampleShop =>
  ({ id, name, type, area, openingHours: daily(open, close), avgPrepMinutes: prep, deliveryMinutes: delivery });

export const shops: SampleShop[] = [
  shop("a-nkechi", "Mama Nkechi Kitchen", "restaurant", "Asaba", "07:00", "21:00", 20, 15),
  shop("a-grill", "Asaba Grill House", "restaurant", "Asaba", "11:00", "23:00", 30, 25),
  shop("a-boli", "Nnebisi Boli Spot", "restaurant", "Asaba", "15:00", "21:00", 10, 10),
  shop("a-okeke", "Okeke Stores", "grocery", "Asaba", "08:00", "20:00", 15, 20),
  shop("a-cable", "Cable Point Mini Mart", "grocery", "Asaba", "07:00", "21:00", 15, 30),
  shop("e-ada", "Nne Ada Kitchen", "restaurant", "Enugu", "08:00", "21:00", 20, 20),
  shop("e-coal", "Coal City Bites", "restaurant", "Enugu", "10:00", "22:00", 15, 10),
  shop("e-musa", "Mallam Musa Suya", "restaurant", "Enugu", "17:00", "23:30", 10, 15),
  shop("e-ogbete", "Ogbete Mart", "grocery", "Enugu", "07:00", "20:00", 15, 25),
  shop("l-tolu", "Mama Tolu Kitchen", "restaurant", "Lagos", "08:00", "22:00", 20, 25),
  shop("l-yaba", "Yaba Fresh Mart", "grocery", "Lagos", "07:00", "21:00", 15, 20),
  shop("abj-wuse", "Wuse Grill and Kitchen", "restaurant", "Abuja", "10:00", "23:00", 25, 20),
  shop("abj-garki", "Garki Stores", "grocery", "Abuja", "08:00", "20:00", 15, 25),
  shop("ph-rumuola", "Rumuola Bites", "restaurant", "Port Harcourt", "09:00", "22:00", 20, 15),
  shop("ph-mile1", "Mile One Market Store", "grocery", "Port Harcourt", "07:00", "19:00", 15, 20),
  shop("ib-bodija", "Iya Bodija Amala Spot", "restaurant", "Ibadan", "07:00", "20:00", 15, 20),
  shop("ib-ring", "Ring Road Supermarket", "grocery", "Ibadan", "08:00", "21:00", 15, 20),
  shop("k-sabon", "Sabon Gari Kitchen", "restaurant", "Kano", "08:00", "22:00", 20, 15),
  shop("k-kofar", "Kofar Mata Provisions", "grocery", "Kano", "07:00", "20:00", 15, 20),
];

type Row = [id: string, shopId: string, name: string, description: string, unit: string | null, size: number | null, price: number, inStock?: boolean];

const food: Row[] = [
  ["p-001", "a-nkechi", "Jollof rice and chicken", "Smoky party jollof with fried chicken", "plate", 1, 2800],
  ["p-002", "a-nkechi", "Jollof rice and fish", "Spicy party jollof with fried fish", "plate", 1, 2500],
  ["p-003", "a-nkechi", "Ofada rice with ayamase", "Local ofada rice with spicy green pepper stew", "plate", 1, 3200],
  ["p-004", "a-nkechi", "Amala with ewedu and gbegiri", "Swallow with ewedu soup, gbegiri and beef", "plate", 1, 2200],
  ["p-005", "a-nkechi", "Akara and pap", "Breakfast: bean cakes with hot pap. Vegetarian", "plate", 1, 1200],
  ["p-006", "a-nkechi", "Yam and egg sauce", "Breakfast: boiled yam with tomato egg sauce. Vegetarian", "plate", 1, 1800],
  ["p-007", "a-nkechi", "Beans and fried plantain", "Ewa agoyin style beans with dodo. Vegetarian", "plate", 1, 1500],
  ["p-008", "a-grill", "Chicken shawarma", "Grilled chicken wrap with sausage and spicy sauce", "piece", 1, 3500],
  ["p-009", "a-grill", "Beef shawarma", "Grilled beef wrap", "piece", 1, 3000],
  ["p-010", "a-grill", "Large pepperoni pizza", "12-inch pizza, serves 4", "piece", 1, 12500],
  ["p-011", "a-grill", "Medium chicken pizza", "10-inch pizza, serves 2", "piece", 1, 8000],
  ["p-012", "a-grill", "Grilled fish and chips", "Grilled tilapia with chips and coleslaw", "plate", 1, 5800],
  ["p-013", "a-grill", "Spicy chicken wings", "6 peppered wings, hot and spicy", "plate", 1, 2400],
  ["p-014", "a-boli", "Boli and grilled fish", "Roasted plantain with grilled fish and pepper sauce", "plate", 1, 3000],
  ["p-015", "a-boli", "Boli and groundnut", "Roasted plantain with groundnuts", "plate", 1, 800],
  ["p-016", "e-ada", "Pounded yam and egusi", "Swallow with egusi soup and beef", "plate", 1, 4200],
  ["p-017", "e-ada", "Eba and ogbono soup", "Mama put swallow with ogbono soup", "plate", 1, 1800],
  ["p-018", "e-ada", "Goat meat pepper soup", "Spicy goat meat pepper soup", "bowl", 1, 3500],
  ["p-019", "e-ada", "Catfish pepper soup", "Spicy point-and-kill catfish pepper soup", "bowl", 1, 5000],
  ["p-020", "e-ada", "Nkwobi", "Spicy cow foot in palm oil sauce", "bowl", 1, 4000],
  ["p-021", "e-ada", "Abacha", "African salad with ugba. Vegetarian", "plate", 1, 1500],
  ["p-022", "e-ada", "Fried yam and egg", "Breakfast: fried yam with fried egg and pepper sauce", "plate", 1, 1400],
  ["p-023", "e-coal", "Fried rice and chicken", "Fried rice with grilled chicken", "plate", 1, 3000],
  ["p-024", "e-coal", "Jollof rice and turkey", "Party jollof with fried turkey", "plate", 1, 3800],
  ["p-025", "e-coal", "Small chops platter, 20 pieces", "Puff-puff, samosa, spring rolls and gizdodo", "pack", 20, 4500],
  ["p-026", "e-coal", "Small chops, 10 pieces", "Puff-puff, samosa and spring rolls", "pack", 10, 2500],
  ["p-027", "e-coal", "Vegetable fried rice", "Fried rice with mixed vegetables. Vegetarian", "plate", 1, 2200],
  ["p-028", "e-musa", "Beef suya", "Spicy grilled beef suya with onions", "portion", 1, 1500],
  ["p-029", "e-musa", "Chicken suya", "Spicy grilled chicken suya", "portion", 1, 2500],
  // Lagos
  ["p-301", "l-tolu", "Jollof rice and chicken", "Smoky party jollof with fried chicken", "plate", 1, 3500],
  ["p-302", "l-tolu", "Ofada rice with ayamase", "Local ofada rice with spicy green pepper stew", "plate", 1, 4000],
  ["p-303", "l-tolu", "Amala with ewedu", "Swallow with ewedu soup and beef", "plate", 1, 3000],
  ["p-304", "l-tolu", "Asun", "Spicy peppered goat meat", "plate", 1, 3500],
  ["p-305", "l-tolu", "Beans and fried plantain", "Ewa agoyin with dodo. Vegetarian", "plate", 1, 2000],
  // Abuja
  ["p-401", "abj-wuse", "Chicken shawarma", "Grilled chicken wrap with spicy sauce", "piece", 1, 4000],
  ["p-402", "abj-wuse", "Beef suya", "Spicy grilled beef suya with onions", "portion", 1, 2000],
  ["p-403", "abj-wuse", "Fried rice and chicken", "Fried rice with grilled chicken", "plate", 1, 3500],
  ["p-404", "abj-wuse", "Goat meat pepper soup", "Spicy goat meat pepper soup", "bowl", 1, 4000],
  ["p-405", "abj-wuse", "Large chicken pizza", "12-inch pizza, serves 4", "piece", 1, 14000],
  // Port Harcourt
  ["p-501", "ph-rumuola", "Banga soup with starch", "Palm fruit soup with starch swallow", "plate", 1, 3500],
  ["p-502", "ph-rumuola", "Fisherman soup", "Spicy seafood soup with periwinkle and fresh fish", "bowl", 1, 6000],
  ["p-503", "ph-rumuola", "Bole and fish", "Roasted plantain with grilled fish and pepper sauce", "plate", 1, 3000],
  ["p-504", "ph-rumuola", "Jollof rice and chicken", "Party jollof with fried chicken", "plate", 1, 3200],
  // Ibadan
  ["p-601", "ib-bodija", "Amala with ewedu and gbegiri", "Swallow with ewedu soup, gbegiri and assorted meat", "plate", 1, 2000],
  ["p-602", "ib-bodija", "Pounded yam and efo riro", "Swallow with vegetable soup", "plate", 1, 3500],
  ["p-603", "ib-bodija", "Ewa aganyin and bread", "Mashed beans with spicy sauce and bread. Vegetarian", "plate", 1, 1500],
  ["p-604", "ib-bodija", "Akara and pap", "Breakfast: bean cakes with hot pap. Vegetarian", "plate", 1, 1000],
  // Kano
  ["p-701", "k-sabon", "Tuwo shinkafa and miyan kuka", "Rice swallow with baobab leaf soup", "plate", 1, 1800],
  ["p-702", "k-sabon", "Masa with miyan taushe", "Rice cakes with pumpkin soup", "plate", 1, 1500],
  ["p-703", "k-sabon", "Kilishi", "Spicy dried beef jerky", "pack", 1, 3000],
  ["p-704", "k-sabon", "Chicken suya", "Spicy grilled chicken suya", "portion", 1, 2200],
  ["p-705", "k-sabon", "Fura da nono", "Millet balls with fresh milk", "bottle", 1, 800],
];

const grocery: Row[] = [
  // Okeke Stores, Asaba
  ["p-101", "a-okeke", "Mama Gold rice, 5kg", "Long grain parboiled rice", "kg", 5, 9500],
  ["p-102", "a-okeke", "Local rice, 1kg", "Nigerian local rice", "kg", 1, 1800],
  ["p-103", "a-okeke", "Indomie noodles, carton of 40", "Instant noodles, chicken flavour, 70g packs", "carton", 40, 9800],
  ["p-104", "a-okeke", "Indomie noodles, single pack", "Instant noodles, chicken flavour, 70g", "pack", 1, 250],
  ["p-105", "a-okeke", "Gino tomato paste, tin", "Tomato paste, 210g tin", "tin", 1, 900],
  ["p-106", "a-okeke", "Peak milk, tin", "Evaporated milk, 160g tin", "tin", 1, 850],
  ["p-107", "a-okeke", "Peak milk powder, sachet", "Powdered milk, 16g sachet", "sachet", 1, 150],
  ["p-108", "a-okeke", "Cowbell milk, sachet", "Powdered milk, 20g sachet", "sachet", 1, 300],
  ["p-109", "a-okeke", "White garri, 1 paint", "Ijebu white garri, one paint bucket", "paint", 1, 4500],
  ["p-110", "a-okeke", "White garri, 25kg bag", "Ijebu white garri, half bag", "bag", 25, 21000],
  ["p-111", "a-okeke", "Titus sardine, tin", "Sardines in oil, 125g tin", "tin", 1, 1200],
  ["p-112", "a-okeke", "Vegetable oil, 1 litre", "Power Oil vegetable oil", "litre", 1, 3000],
  ["p-113", "a-okeke", "Groundnut oil, 1 litre", "Kings groundnut oil", "litre", 1, 3800],
  ["p-114", "a-okeke", "Onions, small basket", "Fresh red onions, about 1kg", "basket", 1, 2000],
  ["p-115", "a-okeke", "Sliced bread, loaf", "Butterscotch sliced bread", "loaf", 1, 1300],
  ["p-116", "a-okeke", "Eggs, crate of 30", "Fresh eggs", "crate", 30, 5800],
  ["p-117", "a-okeke", "Golden Morn, 500g", "Maize cereal", "pack", 0.5, 3500],
  ["p-118", "a-okeke", "Close-Up toothpaste, 140g", "Toothpaste", "tube", 1, 1200],
  ["p-119", "a-okeke", "Joy bathing soap", "Bathing soap bar, 125g", "bar", 1, 500],
  ["p-120", "a-okeke", "Omo detergent, 400g", "Washing powder detergent", "pack", 0.4, 1500],
  // Cable Point Mini Mart, Asaba (a second store, so shopping lists can split across shops)
  ["p-151", "a-cable", "Indomie noodles, carton of 40", "Instant noodles, chicken flavour, 70g packs", "carton", 40, 9500],
  ["p-152", "a-cable", "Sliced bread, loaf", "Fresh family loaf", "loaf", 1, 1200],
  ["p-153", "a-cable", "Ariel detergent, 900g", "Washing powder detergent", "pack", 0.9, 2800],
  ["p-154", "a-cable", "Omo detergent, 400g", "Washing powder detergent", "pack", 0.4, 1450, false],
  ["p-155", "a-cable", "Derica tomato paste, tin", "Tomato paste, 210g tin", "tin", 1, 850],
  // Ogbete Mart, Enugu
  ["p-201", "e-ogbete", "Royal Stallion rice, 5kg", "Long grain parboiled rice", "kg", 5, 9800],
  ["p-202", "e-ogbete", "Local rice, 1kg", "Abakaliki rice", "kg", 1, 1900],
  ["p-203", "e-ogbete", "Indomie noodles, carton of 40", "Instant noodles, chicken flavour, 70g packs", "carton", 40, 10000],
  ["p-204", "e-ogbete", "White garri, 1 paint", "White garri, one paint bucket", "paint", 1, 4200],
  ["p-205", "e-ogbete", "Brown beans, 1 derica", "Oloyin honey beans, one derica cup", "derica", 1, 1200],
  ["p-206", "e-ogbete", "Palm oil, 1 bottle", "Red palm oil, 75cl bottle", "bottle", 1, 2500],
  ["p-207", "e-ogbete", "Crayfish, 1 cup", "Ground dried crayfish", "cup", 1, 1500],
  ["p-208", "e-ogbete", "Maggi cubes, big pack of 100", "Seasoning cubes", "pack", 100, 2200],
  ["p-209", "e-ogbete", "Maggi cube, single", "Seasoning cube", "piece", 1, 30],
  ["p-210", "e-ogbete", "Tomato paste, sachet", "Tomato paste, 70g sachet", "sachet", 1, 250],
  ["p-211", "e-ogbete", "Gino tomato paste, tin", "Tomato paste, 210g tin", "tin", 1, 950],
  ["p-212", "e-ogbete", "Eggs, crate of 30", "Fresh eggs", "crate", 30, 6000],
  ["p-213", "e-ogbete", "Sliced bread, loaf", "Sliced bread", "loaf", 1, 1400],
  ["p-214", "e-ogbete", "Milo, 400g tin", "Chocolate malt drink", "tin", 1, 4200],
  ["p-215", "e-ogbete", "St Louis sugar, 500g", "Sugar cubes", "pack", 0.5, 1800],
  ["p-216", "e-ogbete", "Golden Penny spaghetti, 500g", "Spaghetti pasta", "pack", 0.5, 1100],
  ["p-217", "e-ogbete", "Titus fish, frozen, 1 whole", "Frozen mackerel fish", "piece", 1, 3500],
  ["p-218", "e-ogbete", "Fresh pepper, small bag", "Scotch bonnet and tatashe pepper", "bag", 1, 1000],
  ["p-219", "e-ogbete", "Fresh tomatoes, small basket", "Fresh tomatoes, about 1kg", "basket", 1, 2500],
  ["p-220", "e-ogbete", "Omo detergent, 400g", "Washing powder detergent", "pack", 0.4, 1500],
  ["p-221", "e-ogbete", "Peak milk, tin", "Evaporated milk, 160g tin", "tin", 1, 900],
  ["p-222", "e-ogbete", "Vegetable oil, 1 litre", "Power Oil vegetable oil", "litre", 1, 3100],
  ["p-223", "e-ogbete", "Onions, small basket", "Fresh red onions, about 1kg", "basket", 1, 1800],
  // Yaba Fresh Mart, Lagos
  ["p-351", "l-yaba", "Mama Gold rice, 5kg", "Long grain parboiled rice", "kg", 5, 11000],
  ["p-352", "l-yaba", "Indomie noodles, carton of 40", "Instant noodles, chicken flavour, 70g packs", "carton", 40, 10500],
  ["p-353", "l-yaba", "Gino tomato paste, tin", "Tomato paste, 210g tin", "tin", 1, 1000],
  ["p-354", "l-yaba", "Peak milk, tin", "Evaporated milk, 160g tin", "tin", 1, 950],
  ["p-355", "l-yaba", "Eggs, crate of 30", "Fresh eggs", "crate", 30, 6500],
  ["p-356", "l-yaba", "Sliced bread, loaf", "Sliced bread", "loaf", 1, 1600],
  // Garki Stores, Abuja
  ["p-451", "abj-garki", "Royal Stallion rice, 5kg", "Long grain parboiled rice", "kg", 5, 10500],
  ["p-452", "abj-garki", "Vegetable oil, 1 litre", "Power Oil vegetable oil", "litre", 1, 3300],
  ["p-453", "abj-garki", "Indomie noodles, carton of 40", "Instant noodles, chicken flavour, 70g packs", "carton", 40, 10200],
  ["p-454", "abj-garki", "Omo detergent, 400g", "Washing powder detergent", "pack", 0.4, 1600],
  ["p-455", "abj-garki", "Golden Morn, 500g", "Maize cereal", "pack", 0.5, 3800],
  // Mile One Market Store, Port Harcourt
  ["p-551", "ph-mile1", "Yellow garri, 1 paint", "Yellow garri, one paint bucket", "paint", 1, 4000],
  ["p-552", "ph-mile1", "Palm oil, 1 bottle", "Red palm oil, 75cl bottle", "bottle", 1, 2400],
  ["p-553", "ph-mile1", "Crayfish, 1 cup", "Ground dried crayfish", "cup", 1, 1600],
  ["p-554", "ph-mile1", "Periwinkle, 1 cup", "Fresh shelled periwinkle", "cup", 1, 2000],
  ["p-555", "ph-mile1", "Local rice, 1kg", "Nigerian local rice", "kg", 1, 2000],
  // Ring Road Supermarket, Ibadan
  ["p-651", "ib-ring", "Elubo yam flour, 1kg", "Yam flour for amala", "kg", 1, 2500],
  ["p-652", "ib-ring", "White garri, 1 paint", "Ijebu white garri, one paint bucket", "paint", 1, 4000],
  ["p-653", "ib-ring", "Brown beans, 1 derica", "Oloyin honey beans, one derica cup", "derica", 1, 1100],
  ["p-654", "ib-ring", "Tomato paste, sachet", "Tomato paste, 70g sachet", "sachet", 1, 230],
  ["p-655", "ib-ring", "Sliced bread, loaf", "Sliced bread", "loaf", 1, 1300],
  // Kofar Mata Provisions, Kano
  ["p-751", "k-kofar", "Mama Gold rice, 5kg", "Long grain parboiled rice", "kg", 5, 9000],
  ["p-752", "k-kofar", "Maggi cubes, big pack of 100", "Seasoning cubes", "pack", 100, 2100],
  ["p-753", "k-kofar", "Dangote sugar, 500g", "Granulated sugar", "pack", 0.5, 1700],
  ["p-754", "k-kofar", "Groundnut oil, 1 litre", "Kings groundnut oil", "litre", 1, 3600],
  ["p-755", "k-kofar", "Golden Penny spaghetti, 500g", "Spaghetti pasta", "pack", 0.5, 1000],
];

const toProduct = (category: Product["category"]) =>
  ([id, shopId, name, description, unit, size, price, inStock = true]: Row): Product =>
    ({ id, shopId, name, category, description, unit, size, price, inStock });

export const products: Product[] = [...food.map(toProduct("food")), ...grocery.map(toProduct("grocery"))];
