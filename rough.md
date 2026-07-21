Check the forgot password auth and ensure its working properly
The license plate capture screen has weird lines on each side of the page, maybe its a shadow or what, also move the OCR capture up a bit. In the modal for typing the plate number, reduce the text to a 2 liner text. 
Remove the white background on the OCR license plate capture box.
the additional input field for the safety notes is too close to the buttom of the page, bring it up a bit more, and also the continue button and skip text
now reduce the height of the OCR license plate capture box
Increase the margin space between the chips and additional safety note input field 
The border color for the selected chips should be a lighter shade of the filled color in the chips
Remove the contsiner box of the icon in the selected chips, use just the icon itself
The continue button of the safety notes page is not working
The placement of the back arrows is inconsistent, place them at the same spot across all pages
The border color of the selected chips is still teal instead of a lighter shade of the selected filled color.
The focus state of the input field of the destination screen is too thick, reduce the thickness.
Reduce still the height of the OCR license plate capture box
Remove the teal border color from the chips in the safety notes page
The continue button on the safety notes page is still not working
The continue button and the text below the button is too far down in the trip summary page
The texts "Pleasure park, LNK-582-FK, Hannah Pina-owei, Unfamilar route, Feel uneasy" are too dark, use bold for them.
Also i dont like the how the feel uneasy text and the unfamiliar text are placed, is there a better way to display them?
what are the margin spaces between an element and the buttons across all pages?
Remove the teal border color on the selected chips in the safety notes page
The share and start tracking button on the trip summary page is not working when clicked 
Maybe change how the password requirement is show, maybe make it an inline text beside the password label text as "Minimum 8 characters, a number and symbol"
The content of the trip success page is too down on the page.Bring it up a bit more
change the copy of the send emergency alert of the send emergency modal
Tell agent to put whatsapp integration in phase 2 of app development
End trip button is not working
The map is still zoomed out to show most of southwestern Nigeria rather than the immediate area around the two points
when the user selects their destination, ensure that the selected destination is the one that is pinned on the map with their current location forming a trail to their destination.
The polyline between the current location and the destination is not visible
Use a location pin icon for the user's destination
After sending an alert, i tried ending the trip but it was still not ending
The OTP code input field requires the user to tap on each input field before entering a value, change this to allow for automatic focus on the next input field once a value is entered. Also since this is a mobile first app, make sure to
i told you to make the ends of the dividers a bit rounded, why did you add a border color to the recent trip card on the homepage
use this color for all the dividers, border color CBD4DB across all screens 
The continue button on the trusted contact page is too far down on the page, move it up a bit
Under "Shared With," the contact's phone number 
should render in full and clearly legible (not truncated/masked with 
asterisks as currently shown) — this is the user's own reference 
info, it should never be masked here on the success confirmation page
Remove the shadow or border line on the recent trip card in the homepage
Use this color as the border line color for the cards that have a border line F3EFEF
Add a 12px corner radius on all cards and what is the background color of the cards
The back to camera button on the licence plate capture page should be below the confirm plate button
Reduce the border color thickness on the selected contact on the trusted contact page
Increase the corner radius of the cards in the following pages: homepage, trip summary, success confirmation, alert history, profile.
Privacy & security screen needs a back button
let the back navigation of all the subpages of the profile screen should be aligned horizontally with the content of the page. Like the back button should start on the same line as the cards.
Bring the button on the trusted contact subpage of the profile up a bit more.
Make sure to use consistent space between buttons and the last element on the page across all pages.Use 54px space, it should be uniform.
when i clicked the save changes inthe profile edit page, the changes were not saved, i added a profile user picture but it was not saved.
increase the margin space between the last input field and button in the sign up and login pages, use a margin space of 56px.
Remove the ios or any google autofil background highlight on the input fields in the login and sign up page, that is when a user clicke on the device autofill suggestion, remove the device's background color and let only our app fill background color show on the input field.
add 12px margin space between the buttons of the sign up and login screens of the last input field. reduce the space between the buttons and the captions below them in the sign up and login screens.
Center the contact added successfully in the middle of the page and add an animation of a checkmark growing from the center, add the animation to all success pages of the app.
The texts and icons on the enable location access screen are not aligning vertically.
remove the divider and shadow on the enable location access screen
The button have a fixed property but theyre too close to the bottom of the page, bring them up a bit more. just a bit.

The Active Trip map is repeatedly zooming out to show most of Africa 
instead of just the user's current location and destination. This is 
likely caused by one of the two coordinates passed to fitBounds() being 
an invalid default value (most commonly {lat: 0, lng: 0}, which sits in 
the ocean off the African coast and forces Leaflet to zoom out massively 
to fit both the real point and this bad one).

Fix this in two layers — root cause AND a hard safety constraint:

1. ROOT CAUSE — find where the current position and destination 
   coordinates are set and passed to fitBounds(). Add validation before 
   calling fitBounds():
   - Log both coordinate pairs right before fitBounds() runs
   - Confirm neither is {lat: 0, lng: 0}, null, undefined, or NaN
   - If the current position hasn't loaded yet (e.g. geolocation is still 
     resolving), do NOT call fitBounds() with a placeholder value — wait 
     until both real coordinates are available, showing a brief loading 
     state on the map if needed
   - If destination geocoding (via Nominatim) failed silently and 
     returned no result, handle that explicitly rather than falling back 
     to a zero-coordinate default

2. HARD SAFETY CONSTRAINT — regardless of the above fix, add a maxBounds 
   and reasonable zoom constraints to the MapContainer so the map can 
   never render a world or multi-country view for this Nigeria-only app:

   <MapContainer
     maxBounds={[[4.0, 2.5], [14.0, 15.0]]}  // roughly Nigeria's bounding box
     maxBoundsViscosity={1.0}
     minZoom={6}
     ...
   >

   This ensures that even if a future bug produces a bad coordinate, the 
   map physically cannot pan or zoom out past Nigeria's borders — it's a 
   defensive constraint, not a replacement for fixing the actual data 
   bug above.

3. Once both are in place, fitBounds() should reliably zoom to show just 
   the current position and destination with reasonable padding (e.g. 
   50-80px), at a street/neighborhood level zoom — matching the original 
   reference design — every time the trip screen loads, not just 
   sometimes.

Please confirm with a screenshot showing the map correctly zoomed to just 
the two relevant points, and report what the actual bad coordinate value 
turned out to be.


Fix the divider lines between stacked cards (e.g. Recent Trips list, 
History list, or anywhere cards are stacked with a thin line between 
them) so the line ends appear subtly curved, not flat/squared-off.

This is NOT a separate horizontal divider element between cards. Instead:
- Each card should have border-radius: 8px on ALL corners (not just the 
  top, and not 0 on the bottom)
- Apply the divider as a border-bottom (e.g. 1px solid, light gray 
  #e5e7eb or similar) directly on the card element itself — the same 
  element that has the 8px border-radius
- Because the border-bottom is drawn along the card's own rounded-corner 
  path, it will naturally curve upward right where it meets the 
  bottom-left and bottom-right corners, rather than ending in a sharp 
  90-degree corner like a plain horizontal <hr> or a separately 
  positioned divider div would

Do not implement this as: a separate <div> or <hr> sitting between two 
cards with straight ends and no border-radius of its own — that will 
render as a flat line with squared ends and will NOT reproduce the 
curved-end look.

Apply this consistently to every card-stack pattern in the app that 
currently uses dividers between items (Recent Trips, History list, 
Profile settings groups, etc.) so the visual language is consistent.
