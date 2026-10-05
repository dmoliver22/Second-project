# Pot Luck

**Run a little crab boat through big Bering Sea waves with your crew: brace for the wave, haul the pot, fish whoever went overboard back out, then warm up with a potluck in the galley.**

A cozy-chaotic crab-fishing game for 1–4 players (or solo with a bot crew): set and haul crab pots on a toy-like boat while waves send everyone and everything sliding, then sail home to sell the catch, cook a potluck and upgrade the boat. Played from an overhead dollhouse view or in first person, on PC and phone.

- **Genre:** Cozy-chaotic co-op crab fishing (physics)
- **Camera:** Overhead dollhouse view, switchable to first person
- **Path:** browser test → Steam · **Effort:** large

## The 5-second clip
1. **0–1s** Overhead: a tiny red crab boat on a teal sea, three yellow-slickered crew busy on deck; the bell rings, a white crest rises on the horizon.
2. **1–2s** Two crew grab the rail (hup!); the greenhorn keeps sorting crab, oblivious.
3. **2–3s** WHUMP: spray bursts over the bow, the deck tilts hard, a sheet of water sweeps the deck, crabs and buckets slide.
4. **3–4s** The greenhorn slides the full length of the deck on his back, hat flying, and pops over the rail into the sea.
5. **4–6s** He bobs in a bright orange survival suit, waving; a crewmate throws the life ring in a perfect arc; splash.
6. **6–8s** He flops back aboard like a seal; the boat cat slides past on her belly; cut to the warm galley photo pinned on the wall: 'Ike, airborne'.

## How it feels in your hands
**Brace, then haul.** Hold Brace (Shift / big Brace button on phones / LB) to grab the nearest rail; grab and push the swinging crab pot with LMB / the contextual Action button / A. Works the same in overhead and first person.

**Instantly:** Within one frame of Brace your hands snap to the rail with a rope creak and your stance widens; the HUD warning ring keeps filling toward impact. Grabbing the pot attaches a spring so it swings with the boat's roll in your hands.

**Feedback layers**
- Telegraph: bell, radio call ('Big one, port side!'), white crest on the horizon, HUD ring filling 5–8 s ahead
- Impact: deep whump, spray burst over the bow, short camera shake (scaled by the comfort setting in first person)
- Physics: unbraced crew, buckets and crab slide downhill; a sheet of water washes across the deck
- Held: braced crew lean into the slope with a 'hup!', a small 'Held!' pop, hats wobble but stay on
- Everyone held: 0.3 s slow motion and a crew cheer
- Fail: ragdoll tumble with a squeaky rubber-boot slide; the hat flies off as its own physics object
- Haul: winch whine pitches up, water streams off the rising pot, the line creaks with each swing
- Landing in the level window: heavy THUNK, the deck dips, water cascade, green pulse; out of the window: metal skid and a sliding pot to wrestle
- Tip: crab cascade onto the sorting table with a burst of clicks; a golden king crab adds sparkle, a chime and a camera push-in
- Phones: short haptic buzz on wave impact, pot landing and crab pinches

**Payoff:** Everyone braced through the rogue wave, then the pot lands perfectly in the trough and spills a heap of crab on the table: the 'we're a real crew now' feeling.

**Knobs to tune**
- Wave telegraph lead time (5–8 s): longer is cozier, shorter is more chaotic
- Brace break force vs wave force: how often braced crew still get knocked loose
- Knockdown impulse threshold and ragdoll time (1.2 s): how slapstick it gets
- Deck friction dry / wet / ice and slide control (20%): how far people slide and how much they can fight it
- Pot swing damping and level-window width: how hard landing a pot is
- First-person roll factor (0.3 default, 0–0.6 slider): comfort vs drama
- Auto-rescue time (25 s) and the greenhorn's forget-to-brace rate (30%)

**It feels bad if**
- A wave hits with no readable warning (it must be readable by sight AND by sound)
- Ragdolls jitter, explode or get stuck under objects (unstick nudge after 2 s)
- The first-person camera rolls fully with the boat (motion sickness)
- Touch buttons are small or the Action button doesn't show what it will do
- Waiting in the water feels long, or going overboard costs real progress

## When it clicks
- **First minute:** Inside the first minute, with no menus: you bait and launch your first pot in calm water and watch the buoy pop up; then the bell rings, 'Hold BRACE!', you hold, the wave thumps, and Ike (who didn't) slides across the whole deck into the buoy pile with his hat flying.
- **Later:** The first time you read a rogue set yourself before Mo calls it, shout it to the crew, everyone braces, and you land a full pot in the trough right after: you've become a crab boat crew.

## Look & sound
Imagine a painted wooden toy boat in a moody but gentle sea: chunky shapes, soft toon shading, white foam lines on teal water. Snow drifts across a lavender storm sky, but the wheelhouse windows always glow warm amber. From above it reads like a dollhouse: you can see every crew member, every pot and the cat. In first person it's mittens, rope, spray and that warm light behind you.

**Signature:** Tiny yellow-slickered crew on a red boat in a teal sea, with one orange survival-suit figure bobbing beside it.

**Palette:** Slicker yellow `#F2C230`, Hull red `#C8432F`, Bering teal `#1F5C66`, Foam white `#EAF2F0`, Storm lavender `#7D7BA6`, Galley amber `#F0A65A`, Buoy orange `#E8742B`

**References:** Overcooked (readable chaos); A Short Hike (soft toy shapes); Tiny Glade (warm lighting); the crab-boat TV documentaries (the drama, not the grimness); PEAK / How to Fish (physics comedy)

**Avoid:** Grim realism, gore or real danger; The 'Deadliest Catch' name or show branding (trademark); Muddy dark colors that hide the crew; Full camera roll in first person; AI-generated art

**Sound:** Creaking hull, a warm diesel thrum, the winch whine, bell and foghorn, crackly radio calls from Mo, crab clatter and squeaky rubber boots. A cozy acoustic band (guitar, accordion, light percussion) that adds drums and swells when storms build, and drops to stove crackle and a purring cat in the galley.

## Core loop
1. Pick a fishing ground on the chart
2. Bait and set a string of pots
3. Work the deck while they soak (bait, coil, chip ice, rescue the cat)
4. Haul: hook, winch, land in the level window, tip, sort
5. Decide: one more string or run for home before the storm
6. Harbor: sell, upgrade, cook the potluck, pin the photos

## Design pillars
- Chaos is funny, never cruel: no death, no lost progress beyond a pot or some crab; overboard means bobbing in a survival suit until someone throws the ring.
- Read the sea, then brace: every big moment is telegraphed; the skill is timing.
- Real crab-season craft, simplified: set, soak, haul, sort, ice, sell.
- Warm after cold: galley, stove, potluck, photos, and Barnacle the cat.
- Two ways to see it: overhead for clarity and phones, first person for immersion and clips.

## Views
- Overhead dollhouse (default): narrow-FOV camera high above at 55°, level with the horizon so the deck visibly tilts under it; wheelhouse roof fades when crew are inside; pinch/scroll zoom; outlines and off-screen markers for buoys and anyone overboard.
- First person: mittens visible, center reticle, grabbed things swing on a spring; camera rolls only 30% of the boat's roll (comfort slider 0–60%), subtle optional head-bob.
- Switch anytime with V / the eye button / gamepad Y: a smooth 0.4 s dolly; every action means the same in both views.

## Controls
| Action | PC overhead | PC first person | Phone | Gamepad |
|---|---|---|---|---|
| Move | WASD | WASD | Left floating joystick | Left stick |
| Aim / look | Mouse aims the reach point | Mouse look | Auto-targets nearest interactable; drag right half to look in first person | Right stick |
| Grab / use | Left mouse (hold to carry) | Left mouse | Big contextual Action button | A |
| Throw | Hold right mouse, aim arc, release | Hold right mouse, release | Drag out from Action like a slingshot | Hold RT, release |
| Brace | Shift or Space (hold) | Shift (hold) | Big Brace button (hold) | LB |
| Interact (wheel, levers, pet the cat) | E | E | Action button (contextual) | X |
| Ping a bot | Q at cursor | Q at reticle | Tap a portrait, then a spot | RB |
| Switch view | V | V | Eye button | Y |

## Physics and chaos systems
- Sea: four Gerstner waves plus scheduled rogue sets, the same math on CPU and GPU so what you see moves the boat.
- Boat: rides the sea from 6 hull samples with smoothed heave, pitch and roll; taking a wave side-on rolls about twice as much as bow-on, so steering matters.
- Deck physics runs in the boat's own frame with tilting gravity (stable and phone-friendly): things slide downhill as she rolls and slam aft when the bow lifts.
- Crew wobble on an upright spring, tumble into a light ragdoll on big hits, and lose their hats (separate physics objects).
- Overboard when you cross the rail: bob in an orange survival suit; life-ring throw and winch back; bots throw after 3 s; auto-rescue by crane hook after 25 s.
- Loose gear slides unless lashed; crabs scuttle and pinch ankles; water washes the deck and drains through scuppers; ice builds in snow, lowers friction and makes her top-heavy until chipped off.
- Barnacle the cat slides around on her belly but never goes overboard (claws in at the rail); carry her inside during storms.

## Crew
- Captain Mo (calm, old): steers sensibly and calls waves on the radio; hands over the wheel if you take it.
- Dot (hums while working): capable deckhand.
- Ike (eager greenhorn): forgets to brace 30% of the time — the comic engine.
- Bot priorities: brace on warning → rescue anyone overboard → help with a pot on the rail → sort → bait → coil line → chip ice → idle; ping a spot or object to send the nearest bot.
- Co-op (after the demo): one human captain in the wheelhouse plus deckhands; anyone can swap roles.

## Catch and 'pot luck' specials
- Red king crab (common, good price), blue king crab (less common), snow crab (heaps, low price), golden king crab (rare jackpot with sparkle and fanfare).
- Sorting rule shown visually: wide body + narrow belly flap = keep; throw back females and small crab; mistakes cost a little at sale.
- Specials: message in a bottle (lore postcard), octopus thief (chase it), lost rubber boot (wearable), old ship's bell (galley decor), sea otter riding a pot (pet and release), glowing jellyfish (photo, then release).

## Harbor, galley and progression
- Kittiwake Harbor: fish buyer (tally as crab pour onto the scale), chandlery (upgrades), knit shop (hat colors).
- Upgrades: faster hauler, rail nets (fewer overboards), deck heater lines (less ice), better radar (+2 s warning), bigger tank, cat hammock, paint and flags.
- Galley potluck: drag 2–3 ingredients into the pot; the dish gives a small buff next trip (e.g. 'Warm bellies': brace +10%).
- Photo board: auto-captures up to 6 moments per trip (overboard, wave wipeout, golden crab, special catch, everyone braced, the cat sliding) as captioned Polaroids; Save postcard exports a shareable image.
- Full game: a crab season with a quota, more fishing grounds and weather, a growing harbor, more boats.

## Demo scope (PC and phone browser)
- One boat, one fishing ground, one trip of 2 strings × 5 pots, calm → choppy → storm with 3 rogue sets.
- Solo with bot captain, two bot deckhands and the cat; both views; desktop, phone (touch, portrait overhead-only) and gamepad.
- Sell, one upgrade, potluck, photo board and postcard; settings for quality, comfort roll, haptics, volume, invert look and reduced flashing; progress saved locally.
- Performance: 60 fps desktop, 30–60 fps mid-range phone; placeholder art built from simple shapes in code so a human artist can replace it; no AI art or audio.
- Not in the demo: online co-op (but every crew member, bot or human, acts through the same input-command interface so it can be added later).

## Features
**Demo:**
- One boat, one fishing ground, one trip of 2 strings × 5 pots
- Calm → choppy → storm with 3 rogue sets
- Solo with bot captain Mo, deckhands Dot and Ike, and Barnacle the cat
- Overhead and first-person views; desktop, phone and gamepad
- Sell, one upgrade, potluck, photo board and a shareable postcard

**Full game:**
- Online co-op for 1–4 with captain and deckhand roles
- Several fishing grounds and a full crab season with a quota
- Harbor town with shops, upgrades, boat paint and knitwear
- More species and 'pot luck' specials, a curiosity shelf
- Steam achievements and a season recap

**Later:**
- New boats and fishing types (longline, shrimp, Dungeness)
- Seasonal events (winter festival, aurora nights)
- Crew customization and a photo mode
- Mobile version of the solo game

## Session and timing
- **Session:** A trip is a short arc (sail out, set, soak, haul, storm, home) made of 20–60 second bursts of chaos between calmer deck work, ending in the slow, warm galley scene.
- **First minute:** Bait a pot, push the launcher, watch the buoy pop, first swell, 'Hold BRACE!', Ike slides into the buoy pile.
- **Why now:** Physics co-op chaos is the biggest indie wave on Steam (R.E.P.O. ~18.5M, PEAK ~15.4M in 2025; How to Fish 1M in two days in Aug 2026). Pot Luck's angle is cozy and grounded where competitors went horror, aliens or absurd.

## Return and money
- **Tomorrow:** The next trip's weather and pot luck are different, and you have a new upgrade to try (rail nets, radar, heaters).
- **Later:** A full crab season with quotas, better boats, a harbor town that grows, and the galley wall filling with your crew's funniest photos.
- **Model:** Premium on Steam with a friends 4-pack; free browser demo first ($8–12). How to Fish launched at $7.99 and sold 1M in two days; the friendslop hits mostly sell at $5–15 with group packs.

## Build order (each step's signal to move on)
1. **Sea and boat.** Shared CPU/GPU wave math, the Puffin riding the sea, overhead camera, debug overlay. *Move on when:* The boat visibly heaves, pitches and rolls with the waves under it at 60 fps.
2. **Deck physics and the player.** Boat-local physics with tilting gravity, crew controller, grab/carry/throw. *Move on when:* Loose objects slide downhill as the boat rolls; the player wobbles but stays up in moderate swell.
3. **Waves, brace and overboard.** Rogue sets with full telegraph, brace, ragdoll knockdowns, overboard, life ring rescue, auto-rescue. *Move on when:* Braced crew survive a rogue set, unbraced crew tumble and sometimes go overboard, and rescue by ring works.
4. **Pots and sorting.** Bait, launcher, buoys, soak, grapple, hauler, swing, level-window landing, tip, crab sorting. *Move on when:* A full string can be set and hauled, and good vs bad landings feel clearly different.
5. **First person and touch.** View switch, first-person interactions, touch overlay with contextual Action button, gamepad, haptics. *Move on when:* The whole loop plays on a phone in overhead view and on desktop in both views.
6. **Bots, cat and weather.** Mo, Dot, Ike and Barnacle; weather director, snow, ice and deck wash. *Move on when:* Solo play works end to end with bots; storms are clearly harder and funnier.
7. **Harbor and galley.** Sell, upgrade, potluck, photo capture, photo board, postcard export, save. *Move on when:* A full trip ends in the galley with photos of that trip's real moments.
8. **Polish and phone performance.** Every feel-spec item, quality tiers, comfort settings, real-phone testing. *Move on when:* 60 fps desktop, at least 30 fps on a mid-range phone, no physics explosions in a long storm.

## Risks
- **Physics instability or poor performance on phones.** Boat-local deck physics with a fixed step, capped body counts, a ragdoll pool, instancing and quality tiers; test on a real phone from the second milestone.
- **Motion sickness in first person.** Partial camera roll (0.3 default) with a comfort slider, optional head-bob, and the overhead view as the default.
- **Online co-op for physics is hard to sync.** Demo is solo with bots; all crew act through one input-command interface so networking can be added later without rewriting the simulation.
- **Crowded neighbours (Crabbin' Crew, Water You Doing?, How to Fish).** Own the cozy, grounded lane: no horror or aliens, real crab-season craft, the galley and the cat, and solo play that's fun on its own.
- **Cozy and chaos pull against each other.** No death or progress loss, readable warnings, warm galley endings; chaos costs seconds and makes stories.

## The nine checks
- **provenLoop:** strong. Physics co-op chaos is 2025–26's biggest indie loop (R.E.P.O., PEAK), and How to Fish proved physics fishing sells (1M in two days).
- **openTheme:** ok. Crabbin' Crew (co-op crab boat, Q4 2026) and Water You Doing? are close; the cozy, grounded, solo-friendly version is less taken.
- **hook:** strong. 'Cozy crab boat, big waves, crewmate overboard' is understood instantly from one clip.
- **moment:** strong. A rogue wave sweeping the deck and a friend going overboard is the most shareable moment in the genre.
- **feel:** ok. The brace-and-haul spec is strong on paper, but stable, readable physics is unproven until the deck toy exists.
- **click:** strong. The first-minute brace gag with Ike is scripted to land every time.
- **look:** ok. Strong, readable palette and signature; needs a human artist to make the toy boat and crew charming.
- **timing:** ok. Rides the co-op chaos wave, but the wave is crowding; earlier is better.
- **comeBackAndMoney:** ok. Seasons, upgrades and photos give reasons to return; premium plus 4-packs is proven, but the demo is solo.

## Prove it first
Build only the deck toy: the sea, the Puffin, overhead + first-person views, one rogue wave every 30 seconds, two bot deckhands, Brace and the life ring. Record caption-free clips of a wave wiping the deck and a rescue, and post them. A yes is clips that get shared with 'game name?' and 'I need this with my friends' comments, and people asking for the demo link; a no is views without comments. Then test a 2-player sync spike before committing to online co-op.

**Weakest link:** It's the hardest build in your whole idea pool (stable physics that's fun on phones, then online co-op later), and co-op fishing chaos is getting crowded fast; the cozy, grounded angle and the bot-crew solo mode have to make it stand out.

## What changed from the original idea
- Renamed from the 'Deadliest Catch' idea to Pot Luck (the show name is a trademark)
- Cozy layer added: no death, a warm galley potluck, a boat cat, photos of the trip's funniest moments
- Overhead dollhouse view as the default, with a switch to first person
- Demo is solo with a bot crew so it works on phones; online co-op comes after
- Grounded real-crab-season fantasy instead of horror or aliens, to stand apart from Crabbin' Crew and How to Fish

---

The paste-ready build prompt for the demo is in [build-prompt.md](build-prompt.md).
