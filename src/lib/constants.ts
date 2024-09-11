export const APP_TITLE = "Anihub • Discover and share your taste in anime";
export const DATABASE_PREFIX = "anihub";
export const EMAIL_SENDER = '"Anihub" <noreply@anihub.com>';

export const redirects = {
  toLogin: "/login",
  toSignup: "/signup",
  afterLogin: "/",
  afterLogout: "/",
  toVerify: "/verify-email",
  afterVerify: "/",
} as const;

export const FORMAT_OPTIONS = [
  { value: "tv", label: "TV Show" },
  { value: "movie", label: "Movie" },
  { value: "special", label: "Special" },
  { value: "ova", label: "OVA" },
  { value: "ona", label: "ONA" },
  { value: "music", label: "Music" },
] as const;

export const STATUS_OPTIONS = [
  { value: "airing", label: "Airing" },
  { value: "complete", label: "Complete" },
  { value: "upcoming", label: "Upcoming" },
] as const;

export const RATING_OPTIONS = [
  { value: "g", label: "All Ages" },
  { value: "pg", label: "Children" },
  { value: "pg13", label: "Teens 13 or older" },
  { value: "r17", label: "17+ (violence & profanity)" },
  { value: "r", label: "Mild nudity" },
] as const;

export const ANIME_SORT_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "start_date", label: "Start Date" },
  { value: "end_date", label: "End Date" },
  { value: "score", label: "Score" },
  { value: "scored_by", label: "Scored By" },
  { value: "rank", label: "Rank" },
  { value: "popularity", label: "Popularity" },
  { value: "favorites", label: "Favorites" },
] as const;
