# SafarSuraksha

**SafarSuraksha** is a proactive tourist-safety web application for SIH 2026 problem statement **26202**.

## What the current product does

- Real road-route comparison using OSRM.
- Transparent route-safety scoring using mapped OpenStreetMap/Overpass context.
- Safety evidence for emergency services, public transport, activity and lighting.
- Digital Tourist ID and emergency contact profile.
- Live GPS journey monitoring.
- Server-side route-deviation detection.
- Local/offline route-deviation monitoring when connectivity is lost.
- Offline location queue with automatic synchronization after reconnect.
- SOS alerts for the authority dashboard.
- Offline SOS queue plus device SMS fallback.
- Optional SMS notifications through Twilio and optional email notifications through ZeptoMail.
- Authority login and control-room dashboard.
- Alert acknowledgement and resolution workflow.
- Rate limiting, JWT authentication and protected authority APIs.

## Architecture

**Frontend:** React + Vite + React Leaflet  
**Backend:** Node.js + Express  
**Database:** MongoDB Atlas  
**Routing:** OSRM  
**Geocoding:** Nominatim  
**Mapped safety context:** OpenStreetMap / Overpass  
**Emergency SMS:** Twilio (optional deployment integration)  
**Email alerts:** ZeptoMail (optional deployment integration)

## Local development

### Frontend

```powershell
npm install
npm run dev
```

### Backend

```powershell
cd backend
npm install
npm start
```

Copy `backend/.env.example` to `.env` and configure MongoDB, JWT and any optional notification credentials.

## Important production note

Emergency SMS providers in India have carrier/compliance requirements. Configure the sender, templates and required registrations before treating SMS delivery as a production emergency channel. The web app also provides a device-level SMS fallback when the journey is offline.

Never commit `.env`, API keys, database passwords or provider secrets to GitHub.
