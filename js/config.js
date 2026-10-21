/*
 * The Crest: site settings.
 * This is the only file you need to edit to point every booking button at the real listing.
 */
window.CREST_CONFIG = {
  // Concept build: booking buttons open a short on-page note explaining what a live site
  // would send to Airbnb, instead of leaving for a listing that doesn't exist.
  // Set to false once airbnbUrl points at a real listing.
  demo: true,

  // Paste the full Airbnb listing URL here, e.g. "https://www.airbnb.com.au/rooms/12345678".
  // Every "Check availability" button on the site uses this value.
  airbnbUrl: "https://www.airbnb.com.au/rooms/REPLACE_WITH_LISTING_ID",

  // Appended to every booking link so Airbnb / analytics can show which button was clicked.
  utm: {
    source: "thecrest-site",
    medium: "website",
    campaign: "direct-booking"
  },

  // Used to show tonight's sunset time in the hero (the property's coordinates).
  location: {
    lat: -38.66,
    lng: 143.10,
    timeZone: "Australia/Melbourne"
  },

  // Shown in the hero rating card, reviews section and mobile booking bar (concept values).
  rating: "4.97",
  reviewCount: "126",
  priceFrom: "$1,150",

  maxGuests: 6
};
