# Realtor.com+ consumer onboarding

**Surface:** Consumer (realtor.com+). Built on the Daisy `consumer-srp` shell. Main file: `src/Shell.tsx`.
**Start:** `npm install && npm run dev`
**Fidelity:** Exploratory

A home buyer (sample: Jordan Lee) accepts an invite from their agent, Georgia Booth
(Brightwater Realty Group), and lands already linked to her and her chat.

**IA:** Search, My Listings, Tours, My Home, with Chat (a popover) in the header.

**Onboarding:** the same step modal as `../agent` (progress, Back/Continue, Skip, Finish later),
plus a setup checklist banner for resuming after the modal closes:

1. **Meet your agent:** confirm name, email and phone. The aside is a message from Georgia with quick replies that go into Chat. Can't be skipped.
2. **Search + save homes:** location, max price and beds; save the search; heart homes. These fill My Listings.
3. **Request a tour:** pick a home, date and time. Georgia's aside suggests a slot. This creates an Upcoming tour.
4. **Set up My Home:** say whether you own a home and add its address. This fills My Home (RealEstimate℠ plus the proceeds calculator).

On finish, the user lands on Tours if they requested a tour, otherwise My Listings if they saved homes, otherwise Search.
There's no RealAssist™ on the consumer side.
