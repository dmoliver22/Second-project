# POT LUCK — build prompt for a playable demo (PC + phone browser)

You are a senior gameplay engineer and game-feel specialist. Build a playable browser demo of **Pot Luck**, a cozy-chaotic crab-fishing game: a small crew works a toy-like crab boat through Bering Sea weather. Big waves send everyone and everything sliding, people go overboard and get fished back out, pots come up full of surprises, and the trip ends warm in the galley with a potluck. It must play well on desktop (mouse/keyboard and gamepad) and on phones (touch), from the same URL.

Read this whole brief before writing code. Build in the milestone order at the end, run the game after every milestone, and check each milestone's pass test before moving on. Put every tuning number in one `src/config.ts` so it can be tuned without touching logic.

---

## 1. The feeling we are building

- **Cozy chaos.** Storms are slapstick, never cruel. Nobody dies. Going overboard means bobbing in a bright orange survival suit until someone throws you a ring. The worst outcome is a lost pot or a few crab.
- **Read the sea, then brace.** Every big moment is telegraphed (a bell, a radio call, a white crest on the horizon, a ring filling on the HUD). The skill is timing: brace at the right moment, haul in the trough, launch when the deck is level.
- **Warm after cold.** Cold teal sea and snow outside, amber light and a stove inside. Each trip ends at the harbor with the catch sold, a potluck in the galley and the funniest moments pinned to the wall as photos.
- **Two ways to see it.** A high overhead "dollhouse" view of the whole boat, which is the default and best on phones, and a first-person view on deck. The player switches anytime with one button.

## 2. Tech stack and constraints

- **Vite + TypeScript + Three.js** (current stable). Physics: **Rapier** (`@dimforge/rapier3d-compat`, WASM). No other engines.
- One codebase for desktop and mobile. Mobile Safari and Chrome Android must work. Detect touch with `matchMedia('(pointer: coarse)')` and show touch controls; keyboard/mouse and gamepad work whenever present.
- **No AI-generated images, textures, music or voices.** All placeholder art is built in code from simple geometry (boxes, cylinders, capsules, lathe/extrude shapes) with flat or toon shading and the palette below, so a human artist can replace it later. Keep every visual in its own factory function (`makeBoat()`, `makeCrab(kind)`, `makePot()`, …) so swapping in real models is a one-file change. Audio: simple procedural WebAudio placeholders behind a `sfx.play(name, {pitch, volume})` interface, so a sound designer can drop in real files later.
- **Performance:** 60 fps on a mid-range laptop; 60 fps target and 30 fps floor on a mid-range phone (e.g. iPhone 12 or Pixel 6). Cap devicePixelRatio at 1.5 on phones. Use instancing for crabs, spray and snow. Keep at most 80 dynamic bodies awake. Provide Low/Medium/High quality, and auto-drop quality if the frame time stays above 20 ms.
- Fixed physics step of 60 Hz with an accumulator. Render interpolated. Seeded RNG (`config.seed`) so weather and catches are reproducible for testing.
- A debug overlay on F3 (desktop) or a three-finger tap (phone) showing FPS, body count, the current wave state, the deck gravity vector and the boat roll and pitch.

## 3. The sea, the boat and why the deck physics is local

**Sea.** Implement one shared wave function `seaHeight(x, z, t)` and `seaNormal(x, z, t)`: a sum of 4 Gerstner waves (amplitudes 0.2–0.9 m, wavelengths 8–40 m, varied directions), plus a **rogue set** layer. A rogue set is a single big wave group (amplitude up to 3 m) that the weather director schedules. Use the same formula on the CPU (for the boat and floating things) and in the GPU vertex shader (for the rendered sea), so what you see is what moves the boat. Render a 200 × 200 m sea mesh that follows the boat, with denser vertices near the boat. Add foam on crests (based on the Jacobian or slope) and spray particles when a crest meets the bow.

**Boat.** The boat (a ~20 m crabber called *the Puffin*) is **not** a free rigid body. Each frame, sample the sea at 6 hull points (bow, stern and 2 on each side) and derive heave, pitch and roll from them. Smooth these with a critically damped spring (`config.boat.responsiveness`), then add the steering yaw and forward speed. This keeps the boat stable and cheap while it still visibly rides the sea. Taking a wave on the beam (side-on) gives about twice the roll of taking it on the bow, which gives the captain a real job.

**Deck physics in the boat's local frame (important).** Run the Rapier world for everything on the boat in **boat-local coordinates**: the deck, rails, wheelhouse, pots, crabs, crew, buckets and the cat. Each step, set Rapier's gravity to the real gravity minus the boat's linear acceleration, both rotated into boat space: `g_local = R⁻¹ · (g − a_boat)`. Then add a tangential term from the angular acceleration for bodies far from the center. When the boat rolls, gravity in the local world tilts and things slide downhill. When a wave lifts the bow, things slam aft. This avoids jitter from a fast-moving kinematic platform and runs well on phones. Render each local body at `boatTransform × localTransform`.

**Overboard.** When a local body passes the rail plane by more than 0.3 m and is above the rail height, remove it from the deck world and move it into the **sea state**. In the sea state, things bob on `seaHeight` with simple drift. Crew bob upright in survival suits, crabs sink with a little splash, and pots float on their buoys. Bring a body back into the deck world when it's pulled over the rail (rescue) or hauled by the block.

## 4. Crew (player and bots)

- **Controller.** A capsule (height 1.7 m, radius 0.3 m) with an upright spring (a torque toward local up) so the crew wobble but stay standing. Movement is velocity-based, with lower acceleration on wet deck and almost none on ice. Add small control while sliding (20% of normal) so players can fight a slide.
- **Brace** (hold). Snap both hands to the nearest rail, line or fixed handle within 1.2 m using simple IK or just a hand target plus a lean. While braced, the crew member is attached to that point with a spring joint that breaks only above `config.brace.breakForce`. A braced crew member leans into the slope.
- **Knockdown.** If the impulse on an unbraced crew member, or the slope force, goes above `config.crew.knockdownImpulse`, switch to a light ragdoll for `config.crew.ragdollTime` (1.2 s) then play a get-up. The ragdoll has 6 bodies: pelvis, chest, head, 2 arms and a merged legs body. Keep a pool of at most 3 ragdolls; extra knockdowns use a "tumble roll" animation instead. Hats are separate small bodies and fly off on knockdowns (they respawn on the hat hook in the galley).
- **Overboard rescue.** A crew member in the water bobs and can swim slowly (or wave). Anyone can grab the **life ring** from its hook and throw it in an arc: aim with a preview of the arc, release, and the ring trails a rope. If the ring lands within 1.5 m, the swimmer auto-grabs it, and pulling the rope (hold grab) winches them to the rail, where they flop back aboard with a splash. Bots throw the ring automatically after 3 s. If no one rescues them within 25 s, play a short comedic "fished back by the crane hook" auto-rescue. **There is no death and no game over.**

**Bots.** The demo is solo with 2 bot deckhands and a bot captain.
- **The captain, Mo** (calm, old), steers sensibly and calls waves on the radio. If the player takes the wheel, Mo walks to the deck.
- **Dot** (hums while working) is a capable deckhand.
- **Ike** (eager greenhorn) is a capable deckhand but forgets to brace 30% of the time. He is the comic engine, so tune him for laughs.

Bots use a small priority list:
1. Brace on a wave warning.
2. Rescue anyone overboard.
3. Help with a pot on the rail.
4. Sort crab on the table.
5. Bait jars.
6. Coil line.
7. Chip ice.
8. Idle near the wheelhouse.

The player can **ping** a spot or object to send the nearest bot there (`Tab`/`Q`, or tap a portrait and then tap a spot on phones).

**The boat cat, Barnacle**, wanders and sits on warm spots (the stove, the engine hatch). In big waves she slides around comically on her belly and **can never go overboard**: she digs her claws in at the rail with a scratch sound. The player can pick her up and carry her inside, which is a tiny cozy task during storms. Pet her with the interact button. She purrs, and that's the whole point.

## 5. Fishing: the core loop of a trip

1. **Chart.** At the harbor, choose a fishing ground on a simple chart. The demo has one ground with a forecast that escalates from calm through choppy to a storm.
2. **Set pots.** A pot (a 2 × 2 × 0.9 m steel frame with mesh, 300 kg empty) sits on the **launcher**. Bait it by grabbing a bait jar and clicking it into the pot. Then push the launcher lever. The pot tips over the rail, the line pays out and a buoy pops up. Set a **string** of 5 pots; their buoys show as bobbing orange markers with numbers.
3. **Soak.** Pots fill over time, faster in good spots. While they soak, deck jobs fill the gap: bait jars, coil line (hold and rotate), lash loose gear (straps), chip ice and move the cat inside.
4. **Haul.** Steer the boat alongside a buoy (the captain, or Mo).
   - **Hook it.** A deckhand throws the **grapple hook** (an aimed arc) to catch the buoy line, then drags the line to the **block/hauler** and clicks it in.
   - **Lift it.** Hold the hauler lever: the line winds and the pot rises out of the sea, streaming water. Once clear, the pot swings on its line like a pendulum, driven by the boat's roll.
   - **Land it.** A **spirit-level bubble** on the rail shows when the deck is level. Push or pull the swinging pot (grab and push) so it lands on the rail **in the level window**. A good landing is a heavy THUNK, a deck dip, a water cascade and a green pulse. A bad landing (deck tilted) is a sliding pot that must be wrestled back, which is great chaos.
   - **Tip it.** Tip the pot onto the **sorting table** and the catch cascades out as physics bodies.
5. **Sort.** Crab scuttle sideways on the table and the deck, and pinch ankles, causing a short stagger. Keep big males in the **tank hatch** and throw females and small crab back over the rail. The rule is shown visually: a wide body with a narrow belly flap means keep. It's a glance-and-toss skill that gets faster with practice. Wrongly kept crab cost a little at sale. **Special catches** go in the curiosity crate (see the catch list below).
6. **Weather turns.** The director escalates: more swell, rogue sets, snow and ice. The player decides whether to haul one more string or run for home. The radio voice of Mo nudges ("Barometer's dropping, kid…").
7. **Harbor.** Sell the catch (price per kg × freshness × quality). Choose one **upgrade**. Cook the **potluck**. Pin the trip's photos.

**Catch list for the demo**
- **Red king crab:** common, good price.
- **Blue king crab:** less common.
- **Snow crab:** common, low price, comes in heaps.
- **Golden king crab:** rare jackpot. A shimmer and a little fanfare play when it comes out of the pot.
- **Specials** (the "pot luck"):
  - A message in a bottle: unlocks a postcard with a line of lore.
  - An octopus that steals one item and must be chased.
  - A lost rubber boot: wearable.
  - An old ship's bell: galley decor.
  - A sea otter riding on top of a pot: pet it, then release it for a big cozy moment.
  - A glowing jellyfish: a photo moment, then release.

## 6. Weather director

A timeline-plus-randomness director drives `swell`, `wind`, `snow`, `iceRate` and the rogue-set schedule over a trip.

**Calm** at the start: a tutorial swell only. **Choppy** in the middle. **Storm** at the end.

**Rogue set timing:**
- **Bell** (5–8 s before): the bell rings.
- **Radio call** (4 s before): Mo calls "Big one, port side!"
- **Crest** (3 s before): a white crest rises on the horizon, and a ring on the HUD fills toward impact.
- **Impact:** a deck wash of water (a sheet of water slides across the deck in local space, pushing bodies and floating crabs), screen shake and spray.

**Ice** builds in snow on rails and deck as a visible thickness and lowers friction. Too much ice makes the boat top-heavy (+roll), and is chipped off with a mallet in a rhythmic tap with crisp shards. The deck drains water through scuppers within a few seconds, and ankle-deep water slows walking.

## 7. Cameras and views

**Overhead "dollhouse" (default).**
- **Framing.** A perspective camera with a narrow FOV (30°) at 55° pitch, high above, following the boat with a slight lag. The camera stays **level with the horizon** (it never rolls), so the deck visibly tilts under it and you can read the slope. The wheelhouse roof and upper walls fade out when crew are inside (the dollhouse cutaway).
- **Zoom.** Pinch or scroll between "whole boat" and "close on my deckhand".
- **Clarity.** Outline the player character, show a soft ring under each crew member, and show off-screen indicators for buoys and anyone overboard.

**First person.**
- **View.** Eye height 1.6 m. Mittens are visible holding things.
- **Comfort.** The camera rolls only `config.fp.rollFactor` (default 0.3) of the boat's roll, with a comfort slider in settings from 0 to 0.6. Head-bob is subtle and can be switched off.
- **Interaction.** Center reticle. Grabbed objects hang in front with a spring joint and swing believably.
- **Bracing.** A braced crew member sees their mittens on the rail.

**Switching.** Press V, the gamepad Y button, or the 👁 button on phones. The camera does a 0.4 s smooth dolly between views. Every interaction works in both views with the same meaning.

## 8. Controls

| Action | Desktop: overhead | Desktop: first person | Phone: overhead | Phone: first person | Gamepad |
|---|---|---|---|---|---|
| Move | WASD | WASD | left floating joystick | left floating joystick | left stick |
| Aim / look | mouse cursor aims the reach point | mouse look | auto-targets the nearest interactable in facing direction (highlighted) | drag on the right half | right stick |
| Grab / use (hold to carry, drag a lever) | LMB | LMB | big contextual **Action** button (icon changes: hand, lever, crab, ring…) | Action button | A |
| Throw | hold RMB, aim the arc, release | hold RMB, release | drag out from the Action button like a slingshot, release | same | hold RT, release |
| Brace (hold) | Shift or Space | Shift | **Brace** button (big, bottom right) | Brace button | LB |
| Interact (wheel, levers, pet the cat) | E | E | Action button (contextual) | Action button | X |
| Ping / command a bot | Q (at the cursor) | Q (at the reticle) | tap a portrait, then tap a spot | same | RB |
| Switch view | V | V | 👁 button | 👁 button | Y |
| Pause / menu | Esc | Esc | ☰ button | ☰ button | Start |

**Touch UI rules:**
- **Sizes.** Buttons at least 64 px, the Brace and Action buttons at least 88 px, and all are thumb-reachable.
- **Comfort.** No double-tap requirements, and the Action button shows exactly what it will do.
- **Haptics.** Use `navigator.vibrate` where available: a short buzz on wave impact, a pot landing and a crab pinch. There's a settings toggle for it.
- **Layout.** Support both landscape and portrait. Portrait uses overhead only and shows a hint to rotate for first person.

## 9. Game feel spec (the most important section)

Every frame the player acts, something answers within 50–100 ms. Layer the feedback.

**Brace.**
- **Hands.** On press, the hands snap to the rail in one frame with a rope creak, and the stance widens.
- **Warning.** The HUD ring fills toward impact, and the bell has a doppler-ish pitch rise.
- **Impact.** A deep whump, a spray burst over the bow and a short camera shake (overhead: 0.15 amplitude; first person: scaled by the comfort setting). Unbraced objects slide, and braced crew lean with a "hup!" vocal.
- **Held.** A small "Held!" pop plus a hat-wobble.
- **All held.** If everyone held, play 0.3 s of slow motion and a crew cheer.
- **Fail.** A ragdoll tumble with a squeaky rubber-boot slide sound, and the hat flies.

**Haul.**
- **Lift.** The winch whine pitches up with speed. Water streams off the pot in sheets as it clears the sea.
- **Swing.** The line creaks with the swing, and the spirit-level bubble on the rail glides.
- **Landing.** In the level window: a heavy THUNK, the deck dips 3 cm, a water cascade and a green pulse. Out of the window: a metallic skid and the pot slides.

**Tip.**
- **Cascade.** Crab clatter onto the table: a cascade of clicks and pitched-up chatter. Each crab bounces once with a slight squash.
- **Golden crab.** A sparkle, a chime and a 0.5 s camera push-in.

**Sort.**
- **Grab.** A crab struggles in your mitten (wiggle).
- **Throw back.** A tossed crab spins and drops with a tiny plop and a ring.
- **Keep.** Into the hatch: a hollow knock, and the tank counter ticks up with a soft "+".

**Ice chip.** Each tap gives a crisp crack, shards that tumble and slide downhill, and visible thinning. The last tap gives a bigger shatter.

**Rescue.**
- **Throw.** The ring arcs with a trailing rope and lands with a splash.
- **Pull.** The swimmer grabs it with a "gotcha!", and the pull winches them in with rope creak.
- **Back aboard.** They flop over the rail onto the deck like a seal, with a giggle.

**Tuning knobs (all in config):**
- wave telegraph lead time (5–8 s)
- brace break force
- knockdown impulse threshold
- deck friction (dry / wet / ice)
- slide control factor
- pot swing damping
- the level-window width
- first-person roll factor
- auto-rescue time
- Ike's forget-to-brace rate

**It feels bad if** (avoid all of these):
- a wave hits with no readable warning
- ragdolls jitter or explode
- a player gets stuck under objects (add an unstick nudge after 2 s)
- the first-person camera rolls fully with the boat
- touch buttons are ambiguous
- a pot clips through the deck
- waiting in the water feels long
- the player can't influence a slide at all

## 10. Look and sound (placeholder direction for code-made art)

**Look.** Toy-like and chunky, readable from high above: think a painted wooden toy boat in a moody but warm sea. Flat or toon shading, soft rim light, no realism.

**Palette:**

| Name | Hex | Used for |
|---|---|---|
| Slicker yellow | `#F2C230` | rain gear, the hero color |
| Hull red | `#C8432F` | the boat |
| Bering teal | `#1F5C66` | the sea |
| Foam white | `#EAF2F0` | foam and snow |
| Storm lavender | `#7D7BA6` | the sky in storms |
| Galley amber | `#F0A65A` | window and stove light |
| Buoy orange | `#E8742B` | buoys and survival suits |

**Signature thumbnail:** tiny yellow-slickered crew on a red boat in a teal sea, with white foam and one orange figure bobbing beside the boat.

Lighting shifts with weather from soft morning to a lavender storm with snow. The wheelhouse windows always glow amber, which is the visual promise of warmth.

**Sound (placeholder synth, to be replaced):**
- **Boat:** creaking hull, a diesel thrum, the winch whine, foghorn, bell, radio crackle.
- **Catch:** crab clatter.
- **Music:** a cozy acoustic layer (guitar, accordion, light percussion) that adds drums and swells in storms.
- **Galley:** stove crackle and a purring cat.

## 11. Harbor and galley (the cozy end of a trip)

- **Harbor** (Kittiwake Harbor): a small snowy dock scene with 3 stops.
  - **Fish buyer:** sell, with a tally animation as crab pour onto the scale.
  - **Chandlery:** pick 1 upgrade in the demo from:
    - a faster hauler
    - rail nets (fewer overboards)
    - deck heater lines (less ice)
    - better radar (+2 s of warning)
    - a bigger tank
    - a cat hammock
  - **Knit shop:** pick a hat color.
- **Galley potluck:** the crew sit around a small table with snow on the window, the stove glowing and the cat in the hammock. Drag 2–3 ingredients from the catch and pantry into a pot to cook a dish. The dish gives a small buff for the next trip ("Warm bellies": brace +10%).
- **Photo board:** during the trip, auto-capture up to 6 "moments":
  - someone overboard
  - a wave wipeout
  - the golden crab
  - a special catch
  - everyone braced through a rogue set
  - the cat sliding

  Render them as Polaroids pinned to the galley wall with auto captions ("Ike, airborne"). Offer **Save postcard**, which renders a 1080 × 1350 PNG of the best photo with the trip stats.

## 12. Demo scope (only this)

- **Content:** one boat, one fishing ground and one trip of 2 strings × 5 pots.
- **Weather:** calm, then choppy, then a storm with 3 rogue sets.
- **Harbor:** sell, 1 upgrade, potluck, photo board and postcard.
- **Players:** solo, with the bot captain, 2 bot deckhands and the cat. Both views. Desktop, phone and gamepad.
- **Settings:** quality, comfort roll, haptics, volume, invert look and reduce flashing.
- **Save:** progress in `localStorage` (owned upgrade, hat color, photos).
- **Not in the demo:** online co-op, other boats, other grounds and seasons. But structure the code for co-op later: all crew act through the same `CrewInput` command interface (bots and humans alike), and the simulation must not read the input devices directly.

**Tutorial** (the first minute, no menus): the player spawns on deck in calm water. Contextual prompts teach them to bait the pot, push the launcher, and watch the buoy pop. Then the first small swell arrives and the bell rings: "Hold BRACE!" The player holds, the wave thumps, and Ike (who didn't brace) slides across the deck into a pile of buoys with his hat flying. That gag is the hook, so make it land every time.

## 13. Build order (milestones with pass tests)

1. **Sea and boat.** Gerstner sea with matching CPU and GPU math, the Puffin riding it, the overhead camera, and a debug overlay. *Pass:* the boat visibly heaves, pitches and rolls with the waves it sits on, at 60 fps on desktop.
2. **Deck-local physics and the player.** Local gravity, crew controller, wet and dry friction, grab, carry and throw a bucket and a crab. *Pass:* a loose bucket slides downhill as the boat rolls; the player wobbles but stays up in moderate swell.
3. **Waves, brace, knockdown and overboard.** Rogue sets with the full telegraph, brace with its joint, ragdoll knockdowns, the overboard transfer, the life ring and rescue, and the auto-rescue. *Pass:* braced crew survive a rogue set; unbraced crew tumble and sometimes go overboard; a rescue works by throwing the ring.
4. **Pots.** Bait, launcher, buoys, soak, grapple, hauler, the pendulum swing, the level-window landing, tipping, crab spill and sorting. *Pass:* a full set-and-haul of one string works start to finish, and a good versus bad landing feels clearly different.
5. **First person and touch controls.** The view switch, all actions in first person, the touch overlay with the contextual Action button, gamepad, and haptics. *Pass:* the whole loop from milestone 4 is playable on a phone in overhead view and on desktop in both views.
6. **Bots and the cat.** Captain Mo steering and radio calls, Dot and Ike with the priority list and pings, Barnacle's behaviors. *Pass:* the player can do a whole string while the bots handle the rest; Ike's forgotten braces happen and are funny.
7. **Weather director and ice.** The escalation, snow, ice build-up and chipping, the deck wash, and drains. *Pass:* a storm is clearly harder; ice changes how sliding feels.
8. **Harbor and galley.** Selling, the upgrade choice, potluck cooking, the photo capture and board, the postcard export, and saving. *Pass:* a full trip ends at the warm galley with photos of real moments from that trip.
9. **Polish and performance.** Every feel-spec item, the quality tiers, auto-downgrade, a comfort check, and testing on a real phone. *Pass:* 60 fps desktop, at least 30 fps (target 60) on a mid-range phone, and no physics explosions in 10 minutes of storm play.

## 14. Quality bar and rules

- Prefer stable and readable over realistic. If physics ever explodes, clamp velocities, add damping and fix the root cause; never hide it.
- Never punish with death, lost progress or long waits. Chaos costs a few seconds, a pot or some crab, and makes a story.
- Every warning is readable in both views and with sound off (visual) and without looking (audio).
- Keep the code modular: `sea/`, `boat/`, `deck/` (local physics), `crew/` (controller, ragdoll, bots), `fishing/` (pots, hauler, sorting, catch), `weather/`, `camera/`, `input/` (keyboard, mouse, touch, gamepad mapped to actions), `ui/` (HUD, touch overlay, menus), `harbor/`, `galley/`, `photo/`, `audio/` and `config.ts`.
- Write short notes in `NOTES.md` after each milestone: what was built, what the pass test showed, and the tuning values chosen.
