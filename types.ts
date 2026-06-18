export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  tags: string[];
  image: string;
  forWhat: string;
  manualRecipe?: string;
  category?: "MAIN" | "ADDON" | "SPECIAL";
  is_available?: boolean;
  is_consignment?: boolean;
  consignment_cost?: number;
}

export interface SpotifyTrack {
  title: string;
  artist: string;
  duration: string;
}
