# Jobify React Native – Website Parity Build

This mobile project was aligned against the supplied Jobify React website (`jobify.zip`).

## Included parity areas
- Public Home, Jobs, Job Details, Companies, Company Details, Pricing, About and Contact flows.
- Candidate dashboard, profile, applications, favorites, notifications and messaging.
- Recruiter dashboard, jobs, post job, applications, candidate search, profile, CV packages, company management and messaging.
- Admin dashboard plus Users, Recruiters, Jobs, Applications, Companies, CV Packages, Payments, Pricing, Commission, Analytics, Reports/Moderation, Features, Settings and Contact Enquiries.
- Website-compatible message endpoints: `/api/messages/applications/:applicationId` with mobile backward-compatible aliases.
- Message sending/listing uses the same application-based authorization model as the website backend.
- Socket.IO message events are emitted for realtime updates, while polling remains as a fallback.

## API
The included frontend `.env` points to:
`https://job-portal1-rph3.onrender.com/api`

Change `EXPO_PUBLIC_API_URL` if your production API uses another URL.

## Run mobile frontend
```bash
cd frontend
npm install
npx expo start
```

## Run included backend
1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in your own MongoDB, JWT, email, payment and Cloudinary credentials.
3. Run:
```bash
cd backend
npm install
npm run dev
```

The source archive intentionally does not contain production credentials.
