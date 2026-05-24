# EliteCuts — Legacy Reference

## About This Project

EliteCuts started as my first full-stack application. I built it because I wanted to learn how a real web app fits together end-to-end — not just a tutorial, but something with actual routes, a real database, authentication, an admin dashboard, and a checkout flow. The subject matter came naturally: cooking steaks is a hobby I genuinely love, so building a butcher shop felt less like an exercise and more like something worth finishing.

This took months. Nonstop. Every problem I hit, I had to figure out on my own. There was no team, no mentor, no one to ask. Just documentation, tutorials, Stack Overflow, and a lot of trial and error at hours I shouldn't have been awake. By the end of it I had something that actually worked — and that meant everything.

The original version was rough in ways I can now name clearly. The code worked, but the architecture was improvised — I was figuring out how API routes connected to components, how session data flowed through the app, how MongoDB documents mapped to what the UI needed. Every bug I fixed taught me something I hadn't known to look up before. By the time it was done I understood full-stack development in a way no course had given me.

Design was — and still is — the hardest part for me. I can build the thing. I get stuck deciding on colors, fonts, spacing, how something should feel. The original app was visually basic because my skills weren't there yet. I knew enough to know it looked unfinished, but not enough to fix it confidently.

Nothing in this app was easy. But a few things were a real nightmare.

NextAuth was one of them. Getting the credentials provider, the JWT callbacks, and the session to all work together and stay consistent throughout the app was not straightforward. The errors were cryptic and the docs assumed you already knew things I didn't know yet. I broke it and fixed it more times than I can count.

The cart drawer was another headache. The data model itself was fine — but making the drawer open and close correctly, stay in sync with the server, update instantly without a full reload, and not break when the session changed was a completely different problem. I had to trace the data all the way from the database, through the API route, into context, down through parent components, into the drawer. Understanding that full chain — and knowing where a bug could be hiding at any point in it — is where I finally grasped how data flow actually works in React.

Understanding client and server components was a nightmare too. I spent a lot of time confused about why a hook wasn't working, why something was rendering on the server when I needed it on the client, or why a fetch was firing twice. It forced me to actually learn what `'use client'` means instead of just throwing it on a file to make the error go away.

Bookmarking was meticulous and strenuous to wire up. The heart icon on the product card sounds simple. Getting it positioned correctly over the image, toggling immediately in the UI, saving to the database, and loading the right state on page load — every single part of that had its own problem. The CSS to overlay the icon on the image was a fight. The save call had to hit the API, update the user document, and return something the component could actually use. Nothing about it was automatic.

The image gallery on the product detail page was also very difficult. Making sure the images didn't change sizes too much or look obscure across different viewports took way more time than I expected. You'd think you fixed it, resize the window, and something would break again.

What I was most proud of was the admin panel. Being able to log in as an admin, create a product, upload images directly to Cloudinary, edit it, delete it — through an interface I built myself — felt like proof that this was a real app. The data was real. The images were hosted. The operations persisted. That meant a lot to me.

Looking back on the layouts and design, it was amateur. But the vision was there. The structure, the features, what it was supposed to be — all of that was there. It was just a barebones version of what I always wanted it to look like. The skills weren't there yet. They are now.

The project sat in my repo for a while. I came back to it for two reasons. The first was pride — I wanted it to reflect how much my skills had grown since I built it. The second was a deliberate experiment: I wanted to see how far I could go by integrating AI into my workflow. Not to offload the work, but to see how well I could manage, guide, and supervise these tools to push past the places where I'd historically gotten stuck.

Design was the obvious place to start. Being able to direct an AI on layout, color, and typography decisions — giving it my vision and iterating on the output — removed the bottleneck that had always slowed me down on the frontend. The TypeScript migration benefited too: the mechanical parts of converting 80+ files are tedious but not complex, and AI handles that kind of repetitive work well when supervised. What I kept for myself were the decisions that required understanding the full context of the app — the architecture calls, the tradeoff reasoning, the debugging when something didn't behave as expected.

The redesign is as much about learning to work with these tools effectively as it is about the app itself. That skill — knowing when to use AI, what to delegate, what to verify, and when to override it — feels like one of the more important things to develop right now.

---

## What the Original App Was

The first version of EliteCuts was a **Next.js JavaScript application** bootstrapped with `create-next-app`. It used the Pages Router (not the App Router), plain `.js` and `.jsx` files, Tailwind CSS v3 configured via `tailwind.config.js`, and NextAuth.js for authentication.

It worked. Customers could register, browse products, and place orders. Admins could manage the catalog. But the longer I stayed away from it, the more clearly I could see the cracks — bugs that only showed up in the browser, components that had grown too big, library usage that was flat out wrong. No type safety meant nothing caught those problems until they were already in front of me. The auth had behavior I couldn't fully explain. DOMPurify was being used in places it had no business being.

This is not a rewrite. It is the same app, brought forward.

---

## Decision Log

### 1. JavaScript → TypeScript (Strict Mode)

**What changed:** All source files are migrated from `.js`/`.jsx` to `.ts`/`.tsx`. Strict mode is enabled in `tsconfig.json`.

**Why:** TypeScript is the standard. That alone was enough reason to migrate, but the practical benefits made it obvious. The original JS version had no type checking — props were undocumented, API responses were untyped, and bugs only showed up in the browser when it was already too late. Data could change shape at any point between the database, the API route, and the component and nothing would warn you.

TypeScript fixes that. It enforces consistent data flow from the database all the way through to the UI. You can see where something breaks the moment you write it, not when a user hits it. And it keeps data from being mutated in ways that shouldn't happen — the type system catches those mismatches before they become runtime errors.

The original app had silent bugs because of this. A missing field on a Mongoose document, a key name that didn't match what the component expected — things that strict TypeScript would have flagged immediately.

**Tradeoffs:**
- About 80 `.jsx` files needed to be converted, some with complex prop shapes
- Third-party libraries that lack good typings add noise
- Strict mode blocks patterns that were common in the JS version — which is exactly the point

**Why I accepted them:** The cost is upfront and the benefit is permanent. Every future feature is safer because of it.

---

### 2. Pages Router → App Router

**What changed:** The original app used `pages/` with `getServerSideProps` and `getStaticProps`. The redesign uses the Next.js App Router with React Server Components.

**Why the original used Pages Router:** When I built the first version, the App Router was just coming out of beta. It was a choice between the new `app/` directory that wasn't fully stable yet or the established `pages/` directory that had been around since Next.js launched. I went with the Pages Router. That was the right call at the time — building on something that was still in beta would have added a layer of instability I didn't need while I was already learning everything else.

**Why I switched for the redesign:** By the time I came back to this project, the App Router was stable and it had become the recommended approach. The Pages Router forces data fetching into a separate layer — `getServerSideProps`, `getStaticProps` — that sits outside the component tree. Every page needs an explicit boundary even if it only needs one query. The App Router lets server components fetch directly, which is cleaner and removes a lot of boilerplate. Route groups like `(auth)` and `(main)` also let different layouts apply cleanly without duplicating files.

**Tradeoffs:**
- The App Router's caching model is less predictable; you need to understand when things are static vs. dynamic
- `'use client'` boundaries require deliberate thought — not everything that was a component before belongs on the client
- Some NextAuth patterns from the Pages Router needed adaptation

**Why I accepted them:** It's the direction Next.js is moving. There was no point rebuilding on the Pages Router when the App Router was already stable and clearly the future.

---

### 3. Tailwind CSS v3 → v4

**What changed:** Removed `tailwind.config.js`. All design tokens are now defined in `globals.css` using the `@theme` directive.

**Why:** Tailwind v3 required a JavaScript config file to extend the theme — custom colors, spacing scales, font families all lived in `tailwind.config.ts`. That created a split: the design system lived in a JS file, but was consumed in class strings inside templates. There was no single source of truth that was readable in isolation.

Tailwind v4 moves the config into CSS using standard `@theme` blocks. Custom properties like `--color-oxblood` and `--font-display` live in `globals.css` and are available both as Tailwind utilities and as raw CSS variables anywhere in the stylesheet. The entire design system is in one place.

```css
/* v3 — tailwind.config.js */
theme: {
  extend: {
    colors: {
      oxblood: '#6b1f1f'
    }
  }
}

/* v4 — globals.css */
@theme {
  --color-oxblood: #6b1f1f;
}
```

**Why Tailwind in the first place:** I didn't want to write out CSS the way I had been. Some of my older projects had a separate CSS file for every single component. It worked and it was easier to isolate and fix things, but it created a pile of files and a lot of jumping around. Before that I was doing a lot of inline styling — I got decent at it through HTML email projects, which basically require inline styles for everything. Tailwind felt like the right middle ground. The utility classes kept the styling close to the markup without the overhead of managing separate files for everything.

**Tradeoffs:**
- v4 is a major version with breaking changes; the config format changed entirely from JavaScript to CSS
- Moving from v3 meant learning a new way to define design tokens and custom properties

**Why I accepted them:** Having the entire design system in one CSS file is cleaner than splitting it across a JS config and a stylesheet. Everything is in one place and that makes it easier to manage.

---

### 4. Keeping MongoDB + Mongoose (Not Migrating to Prisma)

**What changed:** Nothing. MongoDB Atlas and Mongoose were kept.

**Why MongoDB in the first place:** Honestly, it was the only database I knew. When I built the original app, SQL was unexplored territory and I was scared to dive into it alone. I had no real understanding of the difference between relational and document databases — what problems each one was built for, when to use one over the other. MongoDB was what I had learned, so MongoDB is what I used.

**Why it stayed for the redesign:** By the time I came back to the project, I had a better understanding. I now know about Prisma and how it makes PostgreSQL integration straightforward. I understand that larger applications with complex relationships and a need for data consistency are better suited to relational databases — tables, foreign keys, joins — rather than documents. For a project at this scale with five models and no complex relationships, MongoDB still made sense. Migrating the database mid-redesign would have been a large amount of work for no real benefit to this specific app.

**What I'd do differently starting fresh today:** I'd evaluate the data model first and seriously consider PostgreSQL with Prisma. The typed query builder, the migration system, and the relational model are all genuinely better fits for a structured domain like orders, users, and products. MongoDB was the right call given what I knew then. It's not necessarily the call I'd make now.

**Tradeoffs of staying:**
- No migration system — schema changes have to be managed manually
- Mongoose's TypeScript support is less ergonomic than Prisma's
- Document databases don't enforce relationships the way relational databases do

---

### 5. DOMPurify — Right Instinct, Wrong Tool

**What changed:** Seven `.jsx` files were applying `DOMPurify.sanitize()` to plain-text inputs — product names, user emails, search queries — before storing them in MongoDB.

**Why it was there:** At the time I was learning about web security and became aware that malicious input through forms was a real attack vector. DOMPurify came up as a sanitization library and I applied it to form fields as a protective measure. The intent was correct — sanitize user input, don't trust what comes through the form — I just didn't yet understand which tool solved which problem.

**What I understand now:** DOMPurify is an XSS sanitizer. It strips HTML tags and event attributes from strings that will be rendered as HTML. Applied to a plain-text field that never gets rendered as HTML, it does nothing useful. The right defenses are layered differently:

- **Database injection:** Mongoose handles this at the driver level via parameterized queries
- **XSS at render time:** React escapes all JSX string values by default — no extra work needed
- **Malformed or malicious input:** validate and reject at the boundary with a schema validator like Zod

DOMPurify has one legitimate use: sanitizing user-supplied HTML before inserting it via `dangerouslySetInnerHTML`. That case doesn't exist in this app.

The broader lesson was about knowing where in the stack each threat lives, and which layer is responsible for defending against it. That mental model is something I didn't have when I first reached for DOMPurify — and now I do.

**Cleanup plan:** Remove from all seven files during the TypeScript migration pass, then uninstall the package.

---

### 6. Bookmarks → Saved Cuts

**What changed:** The `bookmarks` terminology was replaced with `savedCuts` throughout — the database field on User, the API routes (`/api/bookmarks` → `/api/saved-cuts`), the component names, and the hook.

**Why it was "bookmarks" originally:** I thought that was the naming convention. I didn't fully understand that naming should reflect the domain of the app, not just what something generically does. On top of that, the old code had multiple variations of the same concept floating around — "bookmarks" in one place, something closer to "saved cuts" in another. I didn't yet understand how important consistency is across a project. When the same thing has different names in the database, the API, and the UI, it creates confusion and makes bugs harder to track down. You spend time wondering if two things are the same thing or different things.

**What I understand now:** Every concept in an app should have one name and that name should live everywhere — the database field, the API route, the component, the hook, the UI copy. "Saved cuts" is the right term for this app because it means something specific in the context of a butcher shop. "Bookmarks" is what a browser does. The rename was about making the whole codebase speak the same language.

---

### 7. Keeping NextAuth v4 (Not Upgrading to v5)

**What changed:** Nothing. NextAuth v4 is still in use.

**Why NextAuth in the first place:** I could have built standard authentication manually — handling sessions, hashing passwords, managing cookies myself. But security is one of those areas where I didn't want to get it wrong. Rolling your own auth means being responsible for every edge case, every vulnerability, every session management detail. NextAuth handled a lot of that for me. It was confusing to learn and took longer than I expected to get working, but it gave me reassurance that I wasn't leaving obvious security holes in my app. For a first full-stack project, that tradeoff was worth it.

**Why I didn't upgrade to v5:** NextAuth v5 (Auth.js) is basically a rewrite of the library. The config changed, the provider API changed, the session handling changed. The auth was already working and I wasn't going to break something that was stable in the middle of an already large redesign. No clear payoff for the risk.

**What this means going forward:** v5 is planned once the TypeScript migration stabilizes. The current setup is simple enough that the upgrade path is clear when the time comes.

---

### 8. Sonner Replacing react-toastify

**What changed:** `react-toastify` was replaced with `sonner`.

**Why:** I needed something leaner and faster that still looked good out of the box. `react-toastify` works but it comes with baggage — a `<ToastContainer />` that has to be mounted at the root, a separate CSS import, and a lot of configuration just to get it looking decent. Sonner does the same job with almost no setup and the default styling is clean enough to use as-is. It was a straightforward swap and the result felt noticeably lighter.

---

### 9. express-validator (Still Present, Planned for Removal)

**What changed:** Nothing yet. `express-validator` is still used in some API routes.

**Why it was there:** Security again. I was learning about injection attacks and what a malicious actor could do by sending crafted input through a form — scripts that could compromise the database, corrupt data, or cause unintended behavior. I wanted to make sure input fields were validated and sanitized on the server before anything reached the database. express-validator was what I found when I was searching for how to do that in a Next.js API route, so that's what I used.

The intent was right. You should always validate input at the server boundary and never trust what comes through a form. express-validator does that job. The issue is that in a TypeScript codebase it creates a disconnect — you define validation rules in one place and types in another, and nothing ties them together automatically.

**Why it is staying temporarily:** The migration is happening in phases. Swapping validation libraries mid-redesign adds scope that isn't necessary right now.

**Why Zod replaces it:** Zod solves the same security problem but generates TypeScript types directly from the schema. Define the validation rules once, get the type for free. The whole stack stays in sync — the API route, the component, the database call — because they all reference the same schema. That is a much better fit for a TypeScript-first codebase.

**What I understand now:** Input trimming — stripping whitespace, rejecting empty fields, enforcing expected formats — is my responsibility at the API boundary. That's what express-validator and Zod handle. Everything above that — session security, CSRF protection, token management — NextAuth handles for me. Knowing which layer owns which concern is the thing I didn't have clarity on before. Now I do.

---

## What Was Kept Intentionally

Not every decision in the original app was a mistake. Several things were preserved deliberately.

**MongoDB + Mongoose** — Mongoose is how you connect to MongoDB in a Node.js application. It's not optional — it's what makes the database usable. It handles the connection, the schema definitions, and the queries that the API routes depend on. Switching databases mid-redesign would have meant rebuilding all of that from scratch, for a database layer that was already working. Not worth it.

**Cloudinary for images** — I used Cloudinary because I didn't know what else to use for storing images when the app was live on Vercel. Local file storage doesn't work on serverless deployments, so I needed somewhere external to put uploaded images, and Cloudinary was what came up. It worked and it still works. That said, I now know there are better and more stable options — Vercel Blob, AWS S3, Uploadthing — that might be a cleaner fit depending on the use case. Cloudinary stayed for the redesign because changing the image infrastructure mid-migration wasn't worth the disruption.

**Stripe Checkout** — When I first built this app I thought I had to code the entire payment flow myself. I didn't understand that Stripe, PayPal, and others provide either a fully hosted checkout page or pre-built UI components that handle almost everything. I wanted to look competent and have payments in the app, but I never implemented it properly because I genuinely didn't know how. The redesign is where I actually learned how Stripe Checkout works — you create a session on the server, redirect the user to Stripe's hosted page, and handle the webhook on the way back. It's not nearly as complicated as I thought it was, and understanding that made it possible to implement it correctly for the first time.

**Pickup-only fulfillment** — Shipping adds a lot of complexity: address validation, carrier integration, tracking, returns. None of that is in scope for this app. Pickup keeps the checkout flow simple and focused.

**bcryptjs for passwords** — Still the standard approach for password hashing in a Node.js app. It stays.

**Role system (isAdmin boolean)** — There are only two roles: customer and admin. A full role-based access control system would be over-engineering for a two-role app.

---

## Migration Strategy

The migration runs in branches, one phase at a time so each phase is reviewable independently. No phase merges until the build passes with zero TypeScript errors — strict mode is the gate.

```
phase-01-ts-strict-config       TypeScript config, tsconfig.json, path aliases
phase-02-models-typed           Mongoose models with TypeScript interfaces
phase-03-api-routes-typed       API routes converted and typed
phase-04-ui-redesign            Component migration, Tailwind v4, new design
```

The project is currently in **phase-04** — the UI redesign and component migration. Looking at it now compared to where it started, it's hard to believe it's the same app. The original had the right idea but none of the execution. This version looks and feels like what I always had in my head. It took a while to get here.

---

## Closing Reflection

Learning to code on my own — through courses, tutorials, and just building things — has been the most challenging part of this whole journey. There's no one to ask when something breaks at 2am. You figure it out or you don't. That's how most of this app got built.

What I've come to understand is that this is a never-ending learning environment. New tools keep coming. AI is just the latest one, and like every tool before it, it can either sink you or help you grow depending on how you use it. I use it to learn. Not just to get code out faster, but to actually understand things I couldn't grasp from books or tutorials alone. System design clicked for me through working with AI in a way that two books on the subject never managed. I can now think about a feature and immediately consider the tools it needs, the data flow, where the complexity lives, and what to leave out. You can't build an app that does everything — it gets overbloated and the user experience falls apart. Knowing what not to build is as important as knowing how to build.

I also study apps I use every day — the UI, the UX, the small decisions about how something feels. I try to figure out what they did and why. Most of the best tech is built in-house and you'll never see the code or the reasoning behind it. So you observe it, reverse-engineer the thinking, and bring those ideas into your own work.

EliteCuts is still imperfect. There are bugs. There are things I want to improve. But it is the app I always had the vision for — I just didn't have the skills the first time. I have a full understanding now of everything this app is and everything it isn't. That clarity is something the first version never had.

---

*This document reflects the state of the project as of the TypeScript migration. It should be read alongside [README.md](README.md) for the current architecture.*
