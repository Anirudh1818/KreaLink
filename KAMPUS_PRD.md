# KAMPUS.VC HACKATHON — AI CONTENT CREATOR MARKETPLACE

## 1. Project Objective

Transform the existing FanStreak Next.js application into an AI-native marketplace connecting AI creators with brands and creative agencies.

The final product must help brands:

1. Discover suitable AI creators
2. Publish creative briefs
3. Evaluate AI-specific portfolios
4. Manage engagements from discovery through delivery

---

## 2. Primary Users

### Brand / Creative Agency
A brand or agency looking for an AI creator for a specific campaign.

### AI Creator
An AI filmmaker, AI animator, generative artist, or other AI-native creative professional.

---

## 3. Core Product Promise

A brand can describe a creative requirement in natural language.

The platform converts that idea into a structured creative brief and helps identify the most suitable AI creators using creator skills, specialization, AI tools, content types, formats, commercial-use requirements, and portfolio relevance.

---

# 4. Core Features

## A. Creator Profiles & AI Portfolios

Every creator profile should support:

- Name
- Username
- Bio
- Specialization
- Skills
- AI tools used
- AI models used
- Content types
- Supported formats/aspect ratios
- Workflow information
- Commercial-use availability
- Portfolio items
- Verification signals
- Availability

Portfolio items should contain:

- Title
- Description
- Media
- Tools/models used
- Skills
- Content type
- Format
- Workflow
- Commercial-use information

---

## B. Brand / Agency Briefs

A brand must be able to create a structured brief containing:

- Campaign name
- Campaign requirements
- Content type
- Style
- Platform
- Format/aspect ratio
- Target audience
- Deliverables
- Commercial-use requirements
- Additional notes
- Status

---

## C. AI-Assisted Brief Builder

A brand may enter a rough natural-language idea.

Example:

"I need a futuristic 30-second Instagram reel for a sneaker launch targeting Gen Z."

The system should convert this into a structured, editable creative brief.

The user must be able to review/edit the AI-generated fields before saving.

---

## D. Creator Discovery & Filtering

Brands must be able to search creators using:

- Skills
- Specialization
- AI tools
- Content type
- Format
- Commercial-use availability

The system should handle empty results gracefully.

If no exact match exists, the interface may suggest creators with similar capabilities.

---

## E. AI Creator Matching

Given a structured brief, the system should rank suitable creators.

The match should consider:

- Content type compatibility
- Skill compatibility
- Tool compatibility
- Specialization
- Format compatibility
- Commercial-use compatibility
- Portfolio relevance

The system should show:

- Match score
- Ranked creators
- Explanation of why each creator matches

The matching logic should be understandable and demo-friendly.

---

## F. Creator Verification Signals

Show visible trust signals for:

- Tools
- Workflows
- Past work / portfolio

These are platform verification signals for the prototype and must not be represented as legal certification.

---

## G. Engagement

The MVP should support a simple engagement flow:

Brand → Invite Creator → Creator sees invitation → Accept / Reject → Engagement status

Possible statuses:

- Invited
- Accepted
- In Progress
- Delivered

Do NOT build a full project-management system unless time remains after the core MVP is complete.

---

# 5. FanStreak Features Being Retired

The following old FanStreak concepts are NOT part of the new product:

- Fan streaks
- Fan leaderboards
- Supporter rankings
- Supporter badges
- Daily tips
- Fan activity feed
- Creator drops
- Razorpay support transactions
- Payout management
- Fan reward mechanics

Do not reintroduce these concepts into the new product unless explicitly approved later.

---

# 6. Existing Technical Foundation

The existing application already uses:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Firebase
- Firebase Authentication
- Firestore

Reuse this foundation wherever practical.

Do not migrate technologies without a specific technical reason.

Do not upgrade dependencies unnecessarily during the hackathon.

---

# 7. Firebase Data Model

## creators

Document ID:

`{username}`

Core fields should include:

- ownerUid
- name
- username
- bio
- profilePhoto
- specialization
- skills[]
- aiTools[]
- aiModels[]
- contentTypes[]
- formats[]
- workflow
- commercialUse
- verification
- availability

---

## portfolios

Recommended structure:

`creators/{username}/portfolio/{portfolioId}`

Fields:

- title
- description
- mediaUrl
- contentType
- tools[]
- models[]
- skills[]
- workflow
- formats[]
- commercialUse

---

## brands

Document ID:

`{brandId}`

Fields:

- ownerUid
- name
- industry
- description
- logo

---

## briefs

Fields:

- brandId
- campaignName
- requirements
- contentType
- style[]
- platform
- aspectRatio
- targetAudience
- deliverables[]
- commercialUse
- notes
- status
- createdAt
- updatedAt

---

## engagements

Fields:

- briefId
- brandId
- creatorUsername
- status
- createdAt
- updatedAt

---

# 8. AI Architecture

Natural language brief:

User Input
↓
AI Brief Builder
↓
Structured JSON
↓
Validation
↓
Editable Brief
↓
Firestore

Matching:

Structured Brief
↓
Creator Dataset
↓
Matching Logic
↓
Ranked Creators
↓
AI/Rule-Based Match Explanation

---

# 9. MVP Priority

## MUST HAVE

1. Creator profiles
2. AI portfolios
3. Brand briefs
4. Creator search/filtering
5. AI brief builder
6. Creator matching
7. Match explanation

## SHOULD HAVE

1. Verification signals
2. Creator invitation
3. Engagement status

## NICE TO HAVE

Only build these after the must-have functionality is working.

Do not sacrifice core functionality for optional features.

---

# 10. UX Principles

The application should feel like a modern premium creator marketplace.

Prioritize:

- Clean navigation
- Fast flows
- Clear CTAs
- Rich creator cards
- Strong portfolio presentation
- Clear match scores
- Minimal form friction
- Consistent visual language

Existing FanStreak visual components may be reused and adapted.

---

# 11. Hackathon Constraints

This is a student hackathon team with limited programming experience.

Prioritize:

1. Working prototype
2. Reliable demo
3. Simple architecture
4. Fast development
5. Clear AI functionality
6. Strong UX
7. Alignment with judging criteria

Avoid unnecessary complexity.

---

# 12. Demo Story

The primary demonstration should follow this flow:

Brand needs an AI-generated campaign
↓
Brand enters rough idea
↓
AI generates structured brief
↓
Brand reviews brief
↓
Find Creators
↓
AI ranks creators
↓
Open top creator
↓
Review AI portfolio, tools, workflow and commercial use
↓
View verification signals
↓
Invite creator
↓
Creator accepts
↓
Engagement created

---

# 13. Judging Alignment

The solution must directly demonstrate:

### 30% — Creator Profiles & AI Portfolios
Rich creator data and AI-specific portfolio metadata.

### 20% — Brief Definition
Complete structured briefs.

### 25% — Discovery & Filtering
Accurate filters and graceful empty-result handling.

### 15% — User Experience
Simple creator and brand workflows.

### 10% — Presentation & Demo
A clear, working demonstration.

Bonus opportunities:

- Creator verification signals
- AI-assisted brief builder

---

# 14. Development Rule

Build one feature at a time.

Do not rewrite the whole repository at once.

Before changing an existing FanStreak component, identify whether it should be:

KEEP
MODIFY
REMOVE
BUILD NEW

Always preserve working functionality until the replacement is verified.

---

# 15. Definition of Success

A judge should be able to understand the entire value proposition within a few minutes:

A brand describes what it needs → the platform structures the brief → finds suitable AI creators → explains the match → lets the brand evaluate the creator → and starts an engagement.