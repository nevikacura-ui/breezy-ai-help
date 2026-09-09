import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadFigtree } from "@remotion/google-fonts/Figtree";

export const display = loadOutfit("normal", {
  weights: ["300", "500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

export const body = loadFigtree("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
}).fontFamily;

export const C = {
  onyx: "#08080a",
  ink: "#0d0d0f",
  card: "#17171a",
  cream: "#f2ead6",
  creamDim: "rgba(242,234,214,0.58)",
  butter: "#ffd84d",
  butterDeep: "#f5b800",
  lavender: "#a78bfa",
  lavenderSoft: "#c8b5f5",
  mint: "#bde9c9",
  line: "rgba(242,234,214,0.10)",
  glass: "rgba(23,23,26,0.72)",
};
