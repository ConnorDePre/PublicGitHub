export const GENRES = [
  "Fiction",
  "Non-Fiction",
  "Fantasy",
  "Sci-Fi",
  "Mystery",
  "Romance",
  "Biography",
  "History",
  "Poetry",
  "Children",
  "Self-Help",
  "Other",
] as const;

export type Genre = (typeof GENRES)[number];

export const DEFAULT_GENRE: Genre = "Other";

export const isGenre = (value: string): value is Genre =>
  (GENRES as readonly string[]).includes(value);
