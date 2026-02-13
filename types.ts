export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  tags: string[];
  image: string;
  forWhat: string;
  category?: "MAIN" | "ADDON" | "SPECIAL";
  is_available?: boolean;
}

export interface SpotifyTrack {
  title: string;
  artist: string;
  duration: string;
}
