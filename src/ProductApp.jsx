import { useEffect, useMemo, useRef, useState } from "react";
import RealMap from "./RealMap";
import "./ProductApp.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function api(path, options = {}) {
  const response = await fetch(API + path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

const fallbackOrigin = { latitude: 26.9124, longitude: 75.7873 };

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function pointToSegmentKm(point, a, b) {
  const latScale = 111.32;
  const lonScale = 111.32 * Math.cos((point.latitude * Math.PI) / 180);
  const px = point.longitude * lonScale;
  const py = point.latitude * latScale;
  const ax = a.longitude * lonScale;
  const ay = a.latitude * latScale;
  const bx = b.longitude * lonScale;
  const by = b.latitude * latScale;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return haversineKm(point, a);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const nearest = { latitude: (ay + t * dy) / latScale, longitude: (ax + t * dx) / lonScale };
  return haversineKm(point, nearest);
}

function localDistanceToRoute(point, geometry) {
  const coords = geometry?.coordinates || [];
  if (coords.length < 2) return null;
  let min = Infinity;
  for (let i = 1; i < coords.length; i += 1) {
    const a = { longitude: coords[i - 1][0], latitude: coords[i - 1][1] };
    const b = { longitude: coords[i][0], latitude: coords[i][1] };
    min = Math.min(min, pointToSegmentKm(point, a, b));
  }
  return Number.isFinite(min) ? min : null;
}

const OFFLINE_QUEUE_KEY = "ss_pending_locations";

function readPendingLocations() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); } catch { return []; }
}

function queueLocation(point) {
  const queue = readPendingLocations();
  queue.push({ ...point, queuedAt: new Date().toISOString() });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-100)));
}



export default function ProductApp() {
  const [screen,setScreen]=useState("home"), [profile,setProfile]=useState({name:"",phone:"",emergencyContact:""}), [touristId,setTouristId]=useState("");
  const [auth,setAuth]=useState(()=>{try{return JSON.parse(localStorage.getItem("ss_auth"))||null}catch{return null}}), [login,setLogin]=useState({phone:"",password:""});
  const [origin,setOrigin]=useState(null), [destinationQuery,setDestinationQuery]=useState(""), [destination,setDestination]=useState(null), [suggestions,setSuggestions]=useState([]);
  const [routes,setRoutes]=useState([]), [selectedId,setSelectedId]=useState(""), [currentLocation,setCurrentLocation]=useState(null);
  const [journeyId,setJourneyId]=useState(""), [journeyActive,setJourneyActive]=useState(false), [deviation,setDeviation]=useState(null), [sos,setSos]=useState(false);
  const [loading,setLoading]=useState(false), [message,setMessage]=useState(""), [authority,setAuthority]=useState(null), [authorityLoading,setAuthorityLoading]=useState(false), [online,setOnline]=useState(navigator.onLine);
  const watchRef=useRef(null), searchTimer=useRef(null);
  const selectedRoute=useMemo(()=>routes.find(r=>r.id===selectedId)||routes[0],[routes,selectedId]);
  const safetyReason=useMemo(()=>{ if(!selectedRoute?.factors) return null; return Object.entries(selectedRoute.factors).sort((a,b)=>(b[1]?.score??0)-(a[1]?.score??0)).slice(0,3).map(([key,val])=>({key:key.replace(/([A-Z])/g," $1"),score:val?.score??0,evidence:val?.evidence||"Mapped safety evidence available."})); },[selectedRoute]);

  const locate=()=>{ if(!navigator.geolocation){setOrigin(fallbackOrigin);return;} navigator.geolocation.getCurrentPosition(p=>{const point={latitude:p.coords.latitude,longitude:p.coords.longitude};setOrigin(point);setCurrentLocation({...point,accuracy:p.coords.accuracy});},()=>{setOrigin(fallbackOrigin);setMessage("Location permission was not granted; Jaipur demo origin is shown.");},{enableHighAccuracy:true,timeout:10000}); };
  useEffect(()=>{locate();},[]);

  const search=value=>{setDestinationQuery(value);clearTimeout(searchTimer.current);if(value.trim().length<3){setSuggestions([]);return;}searchTimer.current=setTimeout(async()=>{try{const data=await api("/places/search?q="+encodeURIComponent(value));setSuggestions(data.results||[]);}catch(e){setMessage(e.message);}},450);};

  const planRoutes=async()=>{if(!origin){locate();setMessage("Allow location first, then calculate routes.");return;}if(!destination){setMessage("Select a destination from search results.");return;}setLoading(true);setMessage("Calculating routes and analyzing safety factors...");try{const data=await api("/routes/compare",{method:"POST",body:JSON.stringify({origin,destination})});const enriched=[];for(const route of (data.routes||[])){const analysis=await api("/safety/analyze-route",{method:"POST",body:JSON.stringify({route})});enriched.push({...route,...analysis});}setRoutes(enriched);setSelectedId(enriched[0]?.id||"");setScreen("routes");setMessage("");}catch(e){setMessage(e.message);}finally{setLoading(false);}};

  const register=async()=>{if(!profile.name||!profile.phone||!profile.emergencyContact||!destination){setMessage("Name, mobile, emergency contact and destination are required.");return;}setLoading(true);try{const data=await api("/tourists/register",{method:"POST",body:JSON.stringify({...profile,destination:destination.name,locationPermission:Boolean(origin),latitude:origin?.latitude,longitude:origin?.longitude})});setTouristId(data.tourist.touristId);setScreen("routes");setMessage("Safe Tourist Profile created.");}catch(e){setMessage(e.message);}finally{setLoading(false);}};

  const startJourney=async()=>{if(!touristId){setScreen("register");setMessage("Create your Safe Tourist Profile before starting the journey.");return;}if(!selectedRoute)return;setLoading(true);try{const data=await api("/journeys/start",{method:"POST",body:JSON.stringify({touristId,destination:destination.name,routeName:"Route "+selectedId,routeDistance:selectedRoute.distanceKm,safetyScore:selectedRoute.score,latitude:currentLocation?.latitude??origin.latitude,longitude:currentLocation?.longitude??origin.longitude,accuracy:currentLocation?.accuracy,routeGeometry:selectedRoute.geometry,destinationLocation:{latitude:destination.latitude,longitude:destination.longitude}})});setJourneyId(data.journey._id);setJourneyActive(true);setScreen("tracking");setMessage("");}catch(e){setMessage(e.message);}finally{setLoading(false);}};

  useEffect(()=>{const onOnline=()=>setOnline(true);const onOffline=()=>setOnline(false);window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);return()=>{window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);};},[]);

useEffect(()=>{if(!journeyActive||!journeyId||!navigator.geolocation)return;
  const syncPending=async()=>{if(!navigator.onLine)return;const queue=readPendingLocations();if(!queue.length)return;const remaining=[];for(const point of queue){try{await api("/journeys/"+journeyId+"/location",{method:"PUT",body:JSON.stringify(point)});}catch{remaining.push(point);break;}}localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(remaining));};
  const handleOnline=()=>{syncPending();};
  window.addEventListener("online",handleOnline);
  syncPending();

  watchRef.current=navigator.geolocation.watchPosition(async p=>{
    const point={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};
    setCurrentLocation(point);
    const localDistance=localDistanceToRoute(point,selectedRoute?.geometry);
    if(localDistance!==null)setDeviation(localDistance>=0.15?localDistance:null);
    try{
      if(!navigator.onLine){queueLocation(point);setMessage("Offline mode: GPS tracking continues locally. Location will sync when connection returns.");return;}
      const data=await api("/journeys/"+journeyId+"/location",{method:"PUT",body:JSON.stringify(point)});
      setDeviation(data.journey.routeDeviation?data.journey.distanceFromRoute:null);
    }catch{
      queueLocation(point);
      setMessage("Connection lost: GPS tracking continues locally. Location is queued for sync.");
    }
  },()=>setMessage("Live GPS update unavailable."),{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  return()=>{if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current);window.removeEventListener("online",handleOnline);};
},[journeyActive,journeyId,selectedRoute]);

  const activateSOS=async()=>{try{await api("/journeys/"+journeyId+"/sos",{method:"PUT",body:JSON.stringify({active:true,latitude:currentLocation?.latitude,longitude:currentLocation?.longitude})});setSos(true);}catch(e){setMessage(e.message);}};
  const loadAuthority=async()=>{setAuthorityLoading(true);try{const data=await api("/authority/overview",{headers:{Authorization:"Bearer "+auth?.token}});setAuthority(data);setScreen("authority");}catch(e){setMessage(e.message);}finally{setAuthorityLoading(false);}};
  const doLogin=async()=>{setLoading(true);try{const data=await api("/auth/login",{method:"POST",body:JSON.stringify(login)});localStorage.setItem("ss_auth",JSON.stringify(data));setAuth(data);setScreen(data.user.role==="AUTHORITY"||data.user.role==="ADMIN"?"authority":"home");setMessage("Signed in successfully.");}catch(e){setMessage(e.message);}finally{setLoading(false);}};
  const logout=()=>{localStorage.removeItem("ss_auth");setAuth(null);setScreen("home");setAuthority(null);};
  const updateAlert=async(id,status)=>{try{await api("/alerts/"+id+"/status",{method:"PATCH",body:JSON.stringify({status})});await loadAuthority();}catch(e){setMessage(e.message);}};
  const completeJourney=async()=>{try{await api("/journeys/"+journeyId+"/complete",{method:"PUT"});}catch{}setJourneyActive(false);setJourneyId("");setDeviation(null);setSos(false);setScreen("home");};

  return <div className="product-app">
    <header className="product-nav"><button className="brand" onClick={()=>setScreen("home")}>🛡️ SafarSuraksha</button><div className="nav-actions">{auth?<button onClick={logout}>Sign out</button>:<button onClick={()=>setScreen("login")}>Sign in</button>}<button onClick={()=>setScreen("home")}>Home</button>{routes.length>0&&<button onClick={()=>setScreen("routes")}>Routes</button>}{journeyActive&&<button onClick={()=>setScreen("tracking")}>Live Journey</button>}{auth?.user?.role==="AUTHORITY"||auth?.user?.role==="ADMIN"?<button onClick={loadAuthority}>{authorityLoading?"Loading...":"Authority"}</button>:null}</div></header>
    {message&&<div className="product-message">{message}<button onClick={()=>setMessage("")}>×</button></div>}

    {screen==="login"&&<main className="planner"><div className="planner-head"><span className="product-kicker">SECURE ACCESS</span><h2>Sign in to SafarSuraksha</h2><p>Authority accounts can access the control room.</p></div><div className="profile-form"><input placeholder="Mobile number" value={login.phone} onChange={e=>setLogin({...login,phone:e.target.value})}/><input type="password" placeholder="Password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/><button className="primary wide" disabled={loading} onClick={doLogin}>{loading?"Signing in...":"Sign in →"}</button></div></main>}

    {screen==="home"&&<main className="product-home"><section className="product-hero"><div><span className="product-kicker">PROACTIVE TOURIST PROTECTION</span><h1>Choose a safer route.<br/><em>Travel with confidence.</em></h1><p>SafarSuraksha compares real road routes and adds a transparent safety layer using OpenStreetMap data before you start your journey.</p><div className="hero-actions"><button className="primary" onClick={()=>setScreen("plan")}>Plan Safe Journey →</button><button className="secondary" onClick={locate}>Enable Location</button></div><div className="hero-points"><span>✓ Route comparison</span><span>✓ Safety factors</span><span>✓ Live deviation alerts</span></div></div><div className="hero-panel"><div className="shield">🛡️</div><strong>SAFAR SURAKSHA</strong><span>Safety before the emergency</span><div className="hero-stat"><b>100</b><small>SAFETY SCORE</small></div></div></section></main>}

    {screen==="plan"&&<main className="planner"><div className="planner-head"><span className="product-kicker">STEP 01</span><h2>Where are you going?</h2><p>Allow location, search your destination, then compare routes.</p></div><div className="planner-grid"><div className="planner-card"><label>YOUR LOCATION</label><div className="location-pill">{origin?"✓ "+origin.latitude.toFixed(4)+", "+origin.longitude.toFixed(4):"Location not enabled"}<button onClick={locate}>Use GPS</button></div><label>DESTINATION</label><input value={destinationQuery} onChange={e=>search(e.target.value)} placeholder="Search Jaipur City Palace, Amer Fort..." />{suggestions.length>0&&<div className="suggestions">{suggestions.map(s=><button key={s.id} onClick={()=>{setDestination(s);setDestinationQuery(s.name);setSuggestions([]);}}><b>{s.name.split(",")[0]}</b><span>{s.name}</span></button>)}</div>}{destination&&<div className="selected-destination">📍 {destination.name}</div>}<button className="primary wide" disabled={loading} onClick={planRoutes}>{loading?"Analyzing...":"Compare Safe Routes →"}</button></div><div className="planner-note"><div>🗺️</div><h3>Not just the fastest route</h3><p>We compare route distance and time, then analyze mapped emergency services, public transport, activity and lighting around each route.</p></div></div></main>}

    {screen==="register"&&<main className="planner"><div className="planner-head"><span className="product-kicker">STEP 02</span><h2>Create your Safe Tourist ID</h2><p>Your emergency contact is stored with the journey profile.</p></div><div className="profile-form"><input placeholder="Full name" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/><input placeholder="Mobile number" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/><input placeholder="Emergency contact" value={profile.emergencyContact} onChange={e=>setProfile({...profile,emergencyContact:e.target.value})}/><div className="selected-destination">📍 {destination?.name}</div><button className="primary wide" disabled={loading} onClick={register}>{loading?"Creating...":"Create Safe Profile →"}</button></div></main>}

    {screen==="routes"&&<main className="routes-page"><div className="routes-head"><div><span className="product-kicker">STEP 03 • ROUTE INTELLIGENCE</span><h2>Choose your route</h2><p>{destination?.name}</p></div><button className="secondary" onClick={()=>setScreen("plan")}>Change destination</button></div><div className="routes-layout"><div className="route-options">{routes.map((route,i)=><button className={route.id===selectedRoute?.id?"route-option selected":"route-option"} key={route.id} onClick={()=>setSelectedId(route.id)}><div className="route-top"><strong>Route {i+1}</strong><span className={route.score>=70?"score good":"score"}>{route.score}/100</span></div><div className="route-meta"><b>{route.distanceKm} km</b><span>~{route.durationMinutes} min</span><em>{route.level}</em></div><div className="factor-row">{Object.entries(route.factors||{}).slice(0,4).map(([key,val])=><span key={key}>{key.replace(/([A-Z])/g," $1")}: {val.score}</span>)}</div></button>)}<div className="explain"><b>Why is this route safer?</b>{safetyReason?.map(item=><p key={item.key}><strong>{item.key} ({item.score}/100):</strong> {item.evidence}</p>)}<small>Overall safety score: {selectedRoute?.score}/100 • {selectedRoute?.level}<br/>Sources: {selectedRoute?.dataSources?.join(", ")} • Confidence: {selectedRoute?.confidence}</small></div>{routes.length===1&&<div className="route-provider-note"><b>Only one route returned</b><p>The routing provider did not return an alternative road for this origin and destination. We show the real route rather than inventing a second route.</p></div>}{!touristId&&<button className="primary wide" onClick={()=>setScreen("register")}>Create Profile & Start →</button>}{touristId&&<button className="primary wide" disabled={loading} onClick={startJourney}>{loading?"Starting...":"Start This Journey →"}</button>}</div><RealMap routes={routes} selectedRoute={selectedRoute} currentLocation={currentLocation} destination={destination}/></div></main>}

    {screen==="authority"&&<main className="authority-page"><div className="routes-head"><div><span className="product-kicker">SAFARSURAKSHA CONTROL ROOM</span><h2>Authority Dashboard</h2><p>Monitor active journeys and respond to recorded safety alerts.</p></div><button className="secondary" onClick={loadAuthority}>Refresh</button></div>{authority&&<><div className="authority-stats"><div><b>{authority.summary.activeJourneys}</b><span>ACTIVE JOURNEYS</span></div><div><b>{authority.summary.activeAlerts}</b><span>ACTIVE ALERTS</span></div><div className="danger"><b>{authority.summary.sosAlerts}</b><span>SOS ALERTS</span></div><div><b>{authority.summary.deviations}</b><span>DEVIATIONS</span></div></div><div className="authority-grid"><section className="authority-card"><h3>Active Alerts</h3>{authority.activeAlerts.length===0?<p>No active alerts.</p>:authority.activeAlerts.map(a=><article className="authority-alert" key={a._id}><div><strong>{a.type.replaceAll("_"," ")}</strong><span className={a.severity==="CRITICAL"?"critical":""}>{a.severity}</span></div><p>{a.message}</p><small>{new Date(a.createdAt).toLocaleString()}</small><div className="alert-actions"><button onClick={()=>updateAlert(a._id,"ACKNOWLEDGED")}>Acknowledge</button><button onClick={()=>updateAlert(a._id,"RESOLVED")}>Resolve</button></div></article>)}</section><section className="authority-card"><h3>Active Journeys</h3>{authority.activeJourneys.length===0?<p>No active journeys.</p>:authority.activeJourneys.map(j=><article className="journey-row" key={j._id}><div><strong>{j.destination}</strong><span>{j.routeName} • {j.safetyScore}/100</span></div><b>{j.status}</b><small>{j.currentLocation?.latitude?.toFixed?.(5)}, {j.currentLocation?.longitude?.toFixed?.(5)}</small></article>)}</section></div></>}</main>}

    {screen==="tracking"&&<main className="tracking-product"><div className="tracking-head"><div><span className="product-kicker">LIVE JOURNEY</span><h2>You're being monitored.</h2><p>{destination?.name}</p></div><span className="live-dot">{online?"● ONLINE":"● OFFLINE"}</span></div><div className="tracking-grid"><RealMap routes={selectedRoute?[selectedRoute]:[]} selectedRoute={selectedRoute} currentLocation={currentLocation} destination={destination}/><aside><div className="live-card"><span>ROUTE SAFETY</span><b>{selectedRoute?.score}/100</b><p>{selectedRoute?.level}</p></div><div className="live-card"><span>GPS STATUS</span><b>{currentLocation?"ACTIVE":"WAITING"}</b><p>{currentLocation?currentLocation.latitude.toFixed(5)+", "+currentLocation.longitude.toFixed(5):"Waiting for GPS permission"}</p></div>{deviation!==null&&<div className="deviation-card"><b>⚠️ ROUTE DEVIATION</b><p>You are approximately {deviation.toFixed(2)} km from the planned route.</p></div>}{sos&&<div className="sos-card-product"><b>🚨 SOS ACTIVE</b><p>Your SOS alert has been recorded. Keep your phone available for responders.</p></div>}{!sos&&<div className="sos-card-product sos-ready"><b>Emergency help</b><p>If you feel unsafe or need assistance, send your current location to the authority dashboard.</p><button className="primary wide" onClick={activateSOS}>🚨 I NEED HELP / SOS</button></div>}<button className="secondary wide" onClick={completeJourney}>End Journey</button></aside></div></main>}
  </div>;
}
