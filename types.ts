export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  tags: string[];
  image: string;
  forWhat: string;
}

export interface SpotifyTrack {
  title: string;
  artist: string;
  duration: string;
}
