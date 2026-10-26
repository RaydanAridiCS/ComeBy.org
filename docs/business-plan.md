# Comeby — Business Plan & Product Requirements

> **Free, beautiful invites for every hangout. Open source, no ads, no catch.**

| | |
|---|---|
| **Product** | Comeby |
| **Domain** | `comeby.org` |
| **Licence** | AGPL-3.0 |
| **Owner** | Solo founder / developer |
| **Status** | Planning (business side done; tech next) |
| **Last updated** | 2026-10-17 |

Items marked ***(suggested)*** were added during planning and need the founder's confirmation. See [Open Questions](#16-open-questions).

---

## 1. Vision

Comeby makes it easy to invite people to anything: a birthday, a picnic, a hike, a game night, a beach day or a meetup. You also know exactly who's coming.

A host creates a good-looking invite in about a minute and shares one link, usually in WhatsApp. Guests open it, tap "I'm going" and type their name. That's all. The host gets a live dashboard showing who's coming, who's not, what everyone said, and when.

Comeby is **free**, **open source** and **private by default**. It has no ads, no selling data and no paywall on the core features.

**Long-term ambition:** become *the* open-source invitation platform worldwide. It should be the default way young people organise casual plans, and one of the most-starred open-source consumer apps on GitHub (target: 20,000+ stars).

---

## 2. The Problem

**For hosts:**
- Casual plans live in messy WhatsApp groups, where "who's coming?" gets buried under 200 messages.
- Hosts don't know the real headcount, so they buy too much or too little food, book the wrong-size place, or don't know how many cars they need.
- Nobody replies. People say "maybe" in the chat and then go silent.
- If the time or place changes, half the group misses the update.
- Making a nice-looking invite takes design skills or a paid app.

**For guests:**
- They have to download an app or create an account just to say "yes".
- The details (time, place, what to bring) are scattered across a chat.

**The market gap:**
- **Partiful** (the leading casual-invite app) is free "for now", is closed source, and is mostly focused on the US.
- **Apple Invites** needs a paid iCloud+ subscription to create events and is built around Apple devices.
- **Evite** and similar services push ads and premium upsells.
- **Existing open-source tools** (Mobilizon, Gathio, Gancio, Cactoide) are community calendars or basic utilities. **No polished, fun, modern open-source invite app exists.**

---

## 3. Target Users

**Primary audience:** young people (13+) worldwide who organise casual, social plans with friends.

**Launch market:** worldwide, online, English-language.

### Personas

**Lina, 19, the birthday host**
Throws a birthday at a café and invites 25 friends. She wants an invite that looks cute, a clear count of who's coming, and to know who's bringing a +1. Today she counts 👍 reactions in a WhatsApp group and is always wrong.

**Omar, 23, the trip and picnic organiser**
Organises a hike or picnic for 12 people every few weeks. He needs to know who's coming, collect phone numbers for the day, and send updates when the meeting point changes. Later he'll want to know who's driving and who's bringing what.

**Sara, 21, the club or meetup organiser**
Runs a university club or a small interest group, with 30–80 people per event. She needs a reliable headcount, a few custom questions ("Dietary needs?", "First time joining?"), an RSVP deadline and an export of the list.

**The guest (everyone else)**
Opens a link inside WhatsApp on their phone, often on slow mobile data. They will give it **30 seconds at most**. If they're asked to download an app or make an account, they'll leave.

---

## 4. Competition & Positioning

| Competitor | What it is | Weakness we exploit |
|---|---|---|
| **Partiful** | Popular Gen Z party invites, free (2M new users in 2025) | Closed source, "free for now", US-centric, your data sits with a VC-backed company |
| **Apple Invites** | Apple's invite app | Paid (iCloud+) to create events, Apple-centric |
| **Luma** | Event pages for tech meetups and communities | Built for professional events and ticketing, not casual hangouts |
| **Evite** | The old classic | Ads, upsells, dated feel |
| **WhatsApp groups** | What everyone does today | No headcount, no tracking, updates get lost |
| **Mobilizon, Gathio, Gancio, Cactoide** | Open-source event tools | Community calendars or basic tools; not polished, fun or mobile-first |

### Positioning statement

> For young people organising casual plans, **Comeby** is the free, open-source invite app that gives hosts a real headcount and gives guests a 10-second RSVP. Unlike Partiful or Apple Invites, it's open source, free with no catch, and private by default.

### Our edges
1. **Open source.** Anyone can read the code, and the project's good behaviour can be verified, not just promised.
2. **Free with no catch.** No ads, no paywall on core features, no selling data.
3. **Private by default.** Link-only events, the host controls the guest list, and guest data is cleaned up after events *(suggested)*.
4. **The best guest experience available.** No app, no account, a few taps.
5. **Strong host tracking.** Every response, message and change, with timestamps.

---

## 5. Product Principles

These principles settle every product decision:

1. **Guests never sign up.** No account, no app download, ever.
2. **Mobile-first.** Most guests open the link on a phone, inside WhatsApp, on mobile data. It must be fast and light.
3. **The link is the product.** Shared links must show a beautiful preview card in WhatsApp, Instagram and iMessage.
4. **Private by default.** Events are only reachable through their link, and nothing is publicly listed.
5. **Simple first, powerful second.** A first-time host must be able to create an event in under a minute. Advanced options are there but stay out of the way.
6. **Cheap to run.** Every feature must be affordable to offer for free at scale, so there's no SMS and no video.
7. **Built for every language.** English only at launch, but everything is designed so translations can be added later.

---

## 6. Features

### MVP: Launch version

#### Host: creating an event
- Title, description, date and start time, optional end time
- Location: a place name plus a map link, or "online" / "location shared later"
- Cover image upload, or pick a ready-made **theme** (colours and style for the whole invite page)
- Host display name
- Custom event link (for example `comeby.org/linas-bday`) or an auto-generated short link
- Edit the event at any time
- Duplicate an event, to re-run a recurring picnic or game night in seconds
- Cancel an event, with an optional message to guests

#### Host: the guest form (what guests are asked)
- Response options: **Going / Maybe / Can't go**
- Name (always required)
- Phone number: **the host chooses Required, Optional or Not asked**
- Message to host (optional for guests)
- Email for updates (optional for guests; only used for this event)
- Up to 3 custom questions, short text or multiple choice *(suggested)*
- +1s: allow guests to bring others, with a maximum per guest *(suggested)*
- RSVP deadline, plus a manual "close RSVPs" switch *(suggested)*

#### Host: privacy settings per event
- **Guest list visibility:** the host chooses whether guests can see who else is coming.
- Show only counts ("12 going") or full names (when the guest list is visible).
- Phone numbers and messages are **always private to the host**.

#### Host: tracking dashboard (the core value)
- Live headcount: Going / Maybe / Can't, plus total including +1s
- A full list of responses with:
  - name, response, phone (if collected), message, custom answers, +1s
  - **date and time the response was submitted**
  - **date and time of the last change** (for example "changed from Maybe → Going, Sat 3:42 PM")
- **Activity timeline:** a feed of everything that happened ("Ahmad responded Going", "Lina changed to Can't go", "Event location updated")
- Search and filter by response, and sort by newest, oldest or name
- Export the guest list as a spreadsheet (CSV)
- Remove a guest's response (spam or mistakes)

#### Host: sharing
- Copy link
- Share straight to WhatsApp, with a pre-written message ("You're invited to Lina's Birthday 🎉, tap to RSVP: …")
- Download a QR code (for posters or printing)
- A beautiful preview card when the link is pasted anywhere

#### Host: notifications
- **Email alerts:** instant for each new response, or a daily summary (the host picks)
- **Push notifications** on phone or computer when someone responds (when the host saves Comeby to their home screen or allows browser notifications)

#### Host: updating guests
When the host changes the time or place, or cancels:
- Guests who opted in to email get an **update email**.
- The host gets a **ready-made update message** to paste into their WhatsApp group with one tap.
- The event page shows a clear **"Updated" banner** describing what changed.

#### Guest: the event page
- A beautiful invite page with the theme or cover, title, date, time, location and description
- "Add to calendar" (Google, Apple, Outlook)
- "Open in Maps"
- Countdown to the event
- Guest list or count, if the host allows it
- "Updated" or "Cancelled" banners when relevant
- Footer: "Make your own free invite with Comeby" (our main growth engine)

#### Guest: responding
- Pick **Going / Maybe / Can't go**, enter a name (plus phone if the host asked), add an optional message, and submit. Done in seconds.
- Optionally leave an email to receive updates.
- **Edit your response later** from the same device, or through a private link sent by email if they left one *(suggested)*.

#### Platform
- Host accounts with email and password, plus "Sign in with Google" *(suggested)*
- Host profile: name, email, notification preferences
- "My events" page: upcoming and past events with quick stats
- **Report abuse** button on every event page
- Spam protection: limits on how many responses or events can be created in a short time, and bot protection on forms
- **Automatic guest data clean-up:** guests' phone numbers and emails are deleted a set time after the event (for example 90 days) *(suggested; a privacy selling point)*
- Delete account and all data at any time

### Launch themes (the first 5)
Every event uses one theme. A theme sets the colours, fonts, background style and decorations of the whole invite page, and the host can still add their own cover image on top. These five are the basic set; more will be designed after launch, including community-made themes.

| # | Theme | Best for | Mood & look |
|---|---|---|---|
| 1 | **Confetti** 🎉 | Birthdays, parties, celebrations | Bright and playful: a white or cream background, colourful confetti accents, rounded bold headings |
| 2 | **Wild** 🌿 | Picnics, hikes, camping, nature trips | Earthy and calm: forest greens and sand tones, soft leaf or mountain shapes, a relaxed outdoorsy font |
| 3 | **Sunset** 🌅 | Beach days, rooftops, summer hangouts | Warm and dreamy: an orange-to-pink gradient, soft sun glow, light airy text |
| 4 | **Midnight** 🌙 | Game nights, movie nights, nights out | Dark and cosy: a deep navy or black background, neon or glow accents, a modern bold font |
| 5 | **Clean** ✨ | Meetups, club events, study sessions | Simple and neutral: lots of white space, one accent colour, a clean modern font. Works for anything |

Every theme must:
- look great on a phone first
- stay readable (strong contrast between text and background)
- load fast on slow mobile data
- produce a good-looking preview card when the link is shared

### Free-tier hard limits
These limits keep Comeby free, fast and safe from abuse, so one person or bot can't drive up costs for everyone. They're starting values and can be raised as the project grows. When a host reaches a limit, they see a friendly message explaining it, never a surprise error.

| Limit | Value |
|---|---|
| Upcoming (active) events per host at the same time | **10** |
| New events per host per month | **20** |
| Responses per event | **200** |
| +1s per guest | **up to 5** |
| Custom questions per event | **3** |
| Cover images per event | **1** (max **5 MB** upload, automatically compressed) |
| Event description length | **2,000 characters** |
| Guest message length | **300 characters** |
| Update emails ("event changed" or "cancelled") per event | **5** |
| Instant response alert emails per host per day | **50**, after which alerts switch to a daily summary for the rest of the day |
| Responses from the same device to the same event | **5 per hour** (stops spam submissions) |
| New events one host can create per hour | **5** (stops scripted event creation) |
| New host accounts from the same network per day | **3** |
| Reports before an event is automatically hidden for review | **3** |

### v1.1: Fast follow
- **Co-hosts:** invite friends to help manage an event and see the dashboard
- **Capacity limit + waitlist:** "Only 20 spots", with later guests joining a waitlist and moving up automatically
- **Comments wall:** guests can post short messages or hype on the event page (the host can turn it off and moderate)
- **Reminder emails:** automatic "Tomorrow!" reminder to guests who opted in
- **Nudge non-responders:** a ready-made "Still waiting on your RSVP!" message for the host to share
- More themes and cover designs

### v2: Group planning extras
- **Bring list:** "Who brings what?" Guests claim items (drinks, snacks, speaker, ball).
- **Cost chip-in tracking:** show the cost per person and track who has paid. Tracking only, with no real payments handled.
- **Date or place poll:** let the group vote on options before the event is locked in.
- **Rides and carpool:** who's driving, how many seats, who needs a ride.
- **More languages:** first translations, with community contributions.
- Recurring events (weekly game night, monthly hike)

### Later / ideas backlog
- Post-event photo sharing (only once costs are understood)
- Host templates ("Picnic", "Birthday", "Hike" presets with suggested questions)
- Groups or circles: save a friend group and invite them again in one tap
- Calendar subscription for hosts
- Native mobile apps

---

## 7. Key User Flows

### Flow 1: Host creates and shares (target: under 60 seconds)
1. Host signs up or logs in.
2. Taps **New event**, enters a title, date and time, location and description.
3. Picks a theme or uploads a cover.
4. Reviews guest form settings (sensible defaults are already set).
5. Taps **Publish** and gets the link.
6. Taps **Share to WhatsApp** and sends it to the group.

### Flow 2: Guest responds (target: under 30 seconds)
1. Taps the link in WhatsApp and the invite page opens instantly.
2. Reads the details and taps **Going**.
3. Enters their name (and phone if asked), with an optional message and optional email.
4. Taps **Submit** and sees "You're in! 🎉" with an "Add to calendar" button.

### Flow 3: Host tracks
1. Gets a push notification or email: "Ahmad is going to Lina's Birthday."
2. Opens the dashboard to see the live count, the response list with timestamps, and the activity timeline.
3. Exports the list before the event if needed.

### Flow 4: Host updates or cancels
1. Edits the time or place, or taps **Cancel event**.
2. Opted-in guests get an email automatically.
3. The host taps **Copy update message** and pastes it into the WhatsApp group.
4. The event page shows the "Updated" or "Cancelled" banner.

---

## 8. Non-Goals (things we deliberately won't do)

- ❌ **SMS messages**: too expensive to offer for free
- ❌ **Public event discovery or an explore page**: privacy and abuse risk; events are link-only
- ❌ **Ticket sales or real payments**: legal and financial complexity, not our mission
- ❌ **Weddings and formal events**: in our target cultures these use printed premium invitations; we focus on casual plans
- ❌ **Video uploads**: too expensive to host for free
- ❌ **Native mobile apps at launch**: the website must work perfectly on phones first
- ❌ **Ads or selling data**: ever

---

## 9. Sustainability: Staying Free

**Commitment:** Comeby is free with zero charges for a long time. The model will only be revisited if running costs become a real burden, and any future change will never paywall the core features (create, invite, RSVP, track).

### How costs stay low
- No SMS and no video.
- Images are automatically compressed and resized, with a sensible upload size limit.
- **Hard limits** on events, responses, uploads and emails (see [Free-tier hard limits](#free-tier-hard-limits)).
- Guest data is cleaned up after events *(suggested)*, which keeps storage small.
- Emails are only sent when needed (opt-in for guests, configurable for hosts).
- Spam and abuse protection, so bots don't drive up costs.

### How it gets funded
- **Phase 1:** the founder covers costs (small at launch).
- **Phase 2:** donations through GitHub Sponsors and/or Open Collective, with a friendly "Support Comeby" link (never pushy).
- **Phase 3, only if needed:** an optional "Supporter" badge or perks (for example extra themes), with **nothing essential behind a paywall**. Sponsorships from privacy-friendly companies are another option.

### Trigger to review the model
- **If running costs reach $100 per month**, the founder starts planning how to fund Comeby (for example donations, supporter perks or optional plans). Until then, nothing changes: it's free, and this isn't a focus right now.

---

## 10. Go-to-Market

### Built-in growth engine
Every invite reaches 10–100 guests. Every guest sees **"Make your own free invite with Comeby"**. Guests become hosts, so each event markets the product.

### Launch channels (worldwide, online)
1. **Private beta:** the founder's friends and their friend groups. Run real birthdays, picnics and hangouts and fix everything that's confusing.
2. **Developer and open-source launch**, which drives GitHub stars:
   - Show HN on Hacker News: "Comeby, an open-source Partiful alternative"
   - Reddit: r/opensource, r/SideProject, r/webdev, r/InternetIsBeautiful
   - Listings: OpenAlternative, AlternativeTo (as an alternative to Partiful, Evite and Apple Invites), awesome lists
3. **Product Hunt** launch day.
4. **Consumer reach:**
   - Short TikTok, Instagram and YouTube Shorts demos: "how I planned a picnic for 20 people in 1 minute"
   - University clubs, hiking groups, running clubs and community organisers
5. **Ongoing:** a public roadmap and changelog, with regular "what's new" posts.

### Core message
- To guests and hosts: *"Invite anyone in seconds. Know exactly who's coming. Free, no app needed."*
- To developers: *"The open-source Partiful. Free, private, no ads."*

---

## 11. Success Metrics

| Metric | Why it matters | Example early target (first 6 months) |
|---|---|---|
| Events created per week | Core usage | 100+/week |
| Average guests reached per event | Viral reach | 15+ |
| Guest response rate (responses ÷ page views) | Is the guest experience easy enough? | 50%+ |
| Guest → host conversion | Is the growth loop working? | 3–5% of guests create their own event |
| Hosts who create a 2nd event | Retention | 30%+ |
| GitHub stars | Open-source reach | 1,000 at launch → 20,000 long-term |
| Monthly running cost | Sustainability | Tracked from day one |

---

## 12. Open-Source Strategy

- **Code is public** on GitHub. Only the official hosted site (Comeby) is supported; self-hosting is not officially supported for now.
- **Licence: AGPL-3.0.** Anyone can read, learn from and contribute to the code, but anyone who runs a modified copy as a public service must also share their code. This stops companies from taking Comeby and running a closed copy.
- **Public roadmap** and transparent changelog.
- **Contribution areas** that welcome non-coders too:
  - 🎨 **Themes and invite designs** from designers worldwide
  - 🌍 **Translations** (once translations open up)
  - 🐛 Bug reports and feature ideas
- A great README with screenshots, a live demo invite, and a clear "why this exists".

---

## 13. Legal & Privacy

- **Minimum age:** 13+, or 16+ where local law requires it (for example parts of the EU).
- **Privacy policy and terms of service** in plain, human language before launch.
- **GDPR basics:** collect only what's needed, let users delete their data, and explain what's stored and why.
- **Guest data:**
  - Phone numbers and messages are only visible to the host (and co-hosts later).
  - Guest emails are only used for that event's updates, never for marketing.
  - Automatic deletion after the event *(suggested)*.
- **Abuse handling:** a report button, quick takedowns, and the ability to ban abusive accounts.
- **No selling or sharing data with advertisers**, ever.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Partiful or Apple dominate** | High | Compete on what they can't copy: open source, truly free, privacy, a worldwide focus and community themes |
| **Abuse and spam** (scam events, spam links) | High | Link-only events, rate limits, bot protection, report button, fast takedowns |
| **Costs grow faster than donations** | Medium | Cost guardrails (no SMS or video, image compression, data clean-up) plus review triggers set in advance |
| **Solo founder burnout** | High | Small, focused MVP; public roadmap; welcome contributors early; say no to scope creep |
| **Privacy incident** | High | Collect minimal data, auto-delete guest data, keep phone numbers private, follow good security practice |
| **Guests don't respond** | Medium | Ultra-fast RSVP, no account, "nudge non-responders" messages (v1.1) |
| **Design looks cheap** | High | Treat themes as a core feature; invest in a few really beautiful themes before launch |

---

## 15. Roadmap & Milestones

| Phase | Goal | Includes |
|---|---|---|
| **0. Planning** | Lock the idea | This document ✅, domain ✅, licence ✅, tech discussion |
| **1. MVP build** | Core works end to end | Everything in the MVP section above |
| **2. Private beta** | Real events with real friends | 10–20 real events; fix every point of confusion |
| **3. Public launch** | Get noticed | GitHub public, Show HN, Product Hunt, Reddit, social demos |
| **4. v1.1** | Retention and polish | Co-hosts, waitlist, comments, reminders, nudges, more themes |
| **5. v2** | Group planning | Bring list, chip-in, polls, carpool, translations, recurring events |

---

## 16. Open Questions

- [x] **Domain:** `comeby.org`
- [x] **Licence:** AGPL-3.0
- [x] **Confirm the *(suggested)* features:**
  - [x] Up to 3 custom questions
  - [x] +1s with a maximum per guest
  - [x] RSVP deadline and close-RSVPs switch
  - [x] Guests can edit their own response
  - [x] "Sign in with Google"
  - [ ] Automatic deletion of guest data after the event (and how long: 30, 90 or 180 days?)
- [x] **Monthly cost limit:** $100/month triggers planning a funding model
- [x] **Launch themes:** Confetti, Wild, Sunset, Midnight, Clean
- [x] **Free-tier hard limits:** set (starting values; adjustable)


