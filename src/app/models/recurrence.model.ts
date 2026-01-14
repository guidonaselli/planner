export interface RecurrenceConfig {
  active: boolean;
  mode: 'week' | 'custom'; // week = all week (mon-sun or current week view context?), custom = specific days
  days: boolean[]; // Array of 7 booleans (Sun=0, Mon=1...) or Mon=0? JS Date.getDay() is Sun=0
  weeks: number; // Number of weeks to repeat (1 = current week only)
  untilDate?: string; // "YYYY-MM-DD" optional end date (inclusive)
}
