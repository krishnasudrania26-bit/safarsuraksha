import { useEffect, useRef, useState } from "react";
import "./App.css";
import MapView from "./MapView";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const routes = [
  {
    id: "safe",
    name: "SafarSuraksha Safe Route",
    distance: "4.8 km",
    time: "14 min",
    score: 92,
    level: "Very Safe",
    reasons: [
      "Hospital nearby",
      "Main road connectivity",
      "Police station nearby",
      "Well-lit public area",
    ],
  },
  {
    id: "fast",
    name: "Fastest Alternative",
    distance: "4.2 km",
    time: "12 min",
    score: 71,
    level: "Moderate Risk",
    reasons: [
      "Less traffic",
      "Limited emergency services",
      "Low public activity",
    ],
  },
];

function App() {
  const [screen, setScreen] = useState("home");

  const [user, setUser] = useState({
    name: "",
    phone: "",
    destination: "",
    emergencyContact: "",
  });

  const [locationAllowed, setLocationAllowed] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(routes[0]);
  const [journeyStarted, setJourneyStarted] = useState(false);

  const [routeDeviation, setRouteDeviation] = useState(false);
  const [distanceFromRoute, setDistanceFromRoute] = useState(0);
  const [helpNeeded, setHelpNeeded] = useState(false);

  const [sosActive, setSosActive] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const [incidentWarning, setIncidentWarning] = useState(false);
const [riskLevel, setRiskLevel] = useState("LOW");
const [riskZoneName, setRiskZoneName] = useState("");
const [locationStatus, setLocationStatus] = useState("Location not enabled");

  const [alertMessage, setAlertMessage] = useState("");

  const [showDigitalId, setShowDigitalId] = useState(false);
  const [touristId, setTouristId] = useState("");
  const [registering, setRegistering] = useState(false);

  // Journey backend state
  const [journeyId, setJourneyId] = useState("");
  const [startingJourney, setStartingJourney] = useState(false);

  // Live GPS monitoring state
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);
  const watchIdRef = useRef(null);

  const audioContextRef = useRef(null);

  // -----------------------------
  // BACKEND REGISTRATION
  // -----------------------------

  const registerTourist = async () => {
    if (
      !user.name ||
      !user.phone ||
      !user.emergencyContact ||
      !user.destination
    ) {
      setAlertMessage("Please fill all required information.");
      return;
    }

    setRegistering(true);
    setAlertMessage("Creating your Safe Tourist Profile...");

    try {
      let latitude = null;
      let longitude = null;

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          // Continue in demo mode if location is unavailable
        }
      }

      const response = await fetch(`${API_URL}/tourists/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
          phone: user.phone,
          emergencyContact: user.emergencyContact,
          destination: user.destination,
          locationPermission: locationAllowed,
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setTouristId(data.tourist.touristId);

      setAlertMessage(
        `Profile created successfully. Tourist ID: ${data.tourist.touristId}`
      );

      setScreen("dashboard");
    } catch (error) {
      console.error("Registration error:", error);

      setAlertMessage(
        "Unable to connect to SafarSuraksha server. Please make sure the backend is running."
      );
    } finally {
      setRegistering(false);
    }
  };

  // -----------------------------
  // LOCATION
  // -----------------------------

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation not supported");
      return;
    }

    setLocationStatus("Requesting location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationAllowed(true);
        setLocationStatus(
          `Location active • ${position.coords.latitude.toFixed(
            4
          )}, ${position.coords.longitude.toFixed(4)}`
        );
      },
      () => {
        // Demo mode
        setLocationAllowed(true);
        setLocationStatus("Location active • Demo GPS mode");
      }
    );
  };

  // -----------------------------
  // ALERT SOUND
  // -----------------------------

  const playAlertSound = () => {
    if (!soundOn) return;

    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return;

      const context = new AudioContext();
      audioContextRef.current = context;

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;

      gain.gain.setValueAtTime(0.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.25,
        context.currentTime + 0.05
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.5
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
    } catch {
      console.log("Alert sound unavailable");
    }
  };

  // -----------------------------
  // DEVIATION
  // -----------------------------

  const simulateDeviation = () => {
    setRouteDeviation(true);
    setDistanceFromRoute(0.35);
    setAlertMessage(
      "You have moved away from your planned safe route."
    );
    playAlertSound();
  };

  const increaseDeviation = () => {
    setDistanceFromRoute((previous) => {
      const next = Number((previous + 0.25).toFixed(2));
      return next;
    });
    playAlertSound();
  };

  const markSafe = () => {
    setRouteDeviation(false);
    setDistanceFromRoute(0);
    setHelpNeeded(false);
    setAlertMessage("Good! Your journey is continuing safely.");
  };

  const requestHelp = () => {
    setHelpNeeded(true);
    setSosActive(true);
    setAlertMessage(
      "SOS activated. Your location is being shared with emergency contacts and responders."
    );
    playAlertSound();
  };

  // -----------------------------
  // INCIDENT WARNING
  // -----------------------------

  const showIncidentWarning = () => {
  setIncidentWarning(true);
  setRiskLevel("HIGH");
  setRiskZoneName("Amber Road Incident Hotspot");

  setAlertMessage(
    "AI Risk Alert: High-risk incident hotspot detected ahead. Consider the safer route."
  );

  playAlertSound();
};

  // -----------------------------
  // START JOURNEY
  // -----------------------------

  const startJourney = async () => {
    if (!touristId) {
      setAlertMessage(
        "Please create your Safe Tourist Profile first."
      );
      setScreen("register");
      return;
    }

    setStartingJourney(true);
    setAlertMessage("Starting your safe journey...");

    try {
      let latitude = null;
      let longitude = null;

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          // Continue in demo mode if GPS is unavailable.
        }
      }

      const response = await fetch(`${API_URL}/journeys/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          touristId,
          destination: user.destination || "Jaipur City Palace",
          routeName: selectedRoute.name,
          routeDistance: parseFloat(
            selectedRoute.distance.replace(" km", "")
          ),
          safetyScore: selectedRoute.score,
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to start journey."
        );
      }

      setJourneyId(data.journey._id);
      setJourneyStarted(true);
      setIncidentWarning(false);
      setRouteDeviation(false);
      setDistanceFromRoute(0);
      setSosActive(false);
      setHelpNeeded(false);
      setScreen("tracking");

      setAlertMessage(
        "Journey started. SafarSuraksha is monitoring your route."
      );

      console.log("Journey created:", data.journey);
    } catch (error) {
      console.error("Start journey error:", error);

      setAlertMessage(
        "Unable to start journey. Please make sure the backend and MongoDB are running."
      );
    } finally {
      setStartingJourney(false);
    }
  };

  // -----------------------------
  // LIVE GPS MONITORING
  // -----------------------------

  useEffect(() => {
    if (!journeyStarted || !journeyId) return;

    if (!navigator.geolocation) {
      setGpsActive(false);
      return;
    }

    setGpsActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setCurrentLocation({
          latitude,
          longitude,
          accuracy: position.coords.accuracy,
        });

        try {
          await fetch(`${API_URL}/journeys/${journeyId}/location`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              latitude,
              longitude,
              distanceFromRoute: 0,
              routeDeviation: false,
              incidentWarning,
            }),
          });
        } catch (error) {
          console.error("GPS update error:", error);
        }
      },
      (error) => {
        console.error("GPS watch error:", error);
        setGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsActive(false);
    };
  }, [journeyStarted, journeyId]);

  // -----------------------------
  // SOS
  // -----------------------------

  const deactivateSOS = () => {
    setSosActive(false);
    setHelpNeeded(false);
    setAlertMessage("SOS cancelled. Monitoring continues.");
  };

  // -----------------------------
  // HOME
  // -----------------------------

  if (screen === "home") {
    return (
      <div className="app">
        <Navbar
          onHome={() => setScreen("home")}
          onDashboard={() => setScreen("dashboard")}
        />

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              SMART TOURIST SAFETY SYSTEM
            </div>

            <h1>
              Every journey
              <br />
              <span>should be a safe</span>
              <br />
              journey.
            </h1>

            <p>
              SafarSuraksha combines safe-route intelligence,
              real-time monitoring, digital tourist identity and
              emergency response to protect tourists before,
              during and after an emergency.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-btn"
                onClick={() => setScreen("register")}
              >
                Start Safe Journey →
              </button>

              <button
                className="secondary-btn"
                onClick={() => setScreen("dashboard")}
              >
                View Safety Dashboard
              </button>
            </div>

            <div className="feature-row">
              <Feature
                icon="🛡️"
                title="92% Safe Route"
                text="AI safety scoring"
              />
              <Feature
                icon="📍"
                title="Live Monitoring"
                text="Route deviation detection"
              />
              <Feature
                icon="🚨"
                title="Instant SOS"
                text="Emergency response"
              />
            </div>
          </div>

          <div className="hero-card">
            <div className="shield-icon">🛡️</div>
            <h2>SafarSuraksha</h2>
            <p>Proactive Tourist Protection</p>

            <div className="score-circle">
              <strong>92</strong>
              <span>SAFE</span>
            </div>

            <div className="hero-route">
              <span>Recommended Route</span>
              <strong>4.8 km • 14 min</strong>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            <span>WHY SAFARSURAKSHA?</span>
            <h2>Safety starts before the emergency.</h2>
          </div>

          <div className="cards">
            <InfoCard
              icon="🪪"
              title="Digital Tourist ID"
              text="Create a verified tourist profile with emergency contacts and a secure digital identity."
            />

            <InfoCard
              icon="🗺️"
              title="Safety-Aware Routes"
              text="Compare routes using hospitals, police presence, public transport, activity and risk zones."
            />

            <InfoCard
              icon="🤖"
              title="AI Risk Detection"
              text="Identify incident hotspots and dynamically warn tourists about unsafe areas."
            />

            <InfoCard
              icon="🚨"
              title="SOS Response"
              text="Detect route deviation and inactivity, then connect tourists with emergency responders."
            />
          </div>
        </section>
      </div>
    );
  }

  // -----------------------------
  // REGISTER
  // -----------------------------

  if (screen === "register") {
    return (
      <div className="app">
        <Navbar
          onHome={() => setScreen("home")}
          onDashboard={() => setScreen("dashboard")}
        />

        <div className="page-container">
          <div className="form-card">
            <div className="eyebrow">STEP 01 • REGISTER</div>

            <h1>Create your Safe Tourist Profile</h1>

            <p className="muted">
              Your information helps SafarSuraksha coordinate
              emergency assistance when required.
            </p>

            <div className="form-grid">
              <label>
                Full Name
                <input
                  value={user.name}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter your name"
                />
              </label>

              <label>
                Mobile Number
                <input
                  value={user.phone}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Enter mobile number"
                />
              </label>

              <label>
                Emergency Contact
                <input
                  value={user.emergencyContact}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      emergencyContact: e.target.value,
                    })
                  }
                  placeholder="Emergency contact number"
                />
              </label>

              <label>
                Destination
                <input
                  value={user.destination}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      destination: e.target.value,
                    })
                  }
                  placeholder="Example: Jaipur City Palace"
                />
              </label>
            </div>

            <div className="location-box">
              <div>
                <strong>📍 Location Permission</strong>
                <p>{locationStatus}</p>
              </div>

              <button
                className={
                  locationAllowed
                    ? "success-btn"
                    : "secondary-btn"
                }
                onClick={requestLocation}
              >
                {locationAllowed
                  ? "✓ Location Enabled"
                  : "Allow Location"}
              </button>
            </div>

            <button
              className="primary-btn full-btn"
              onClick={registerTourist}
              disabled={registering}
            >
              {registering
                ? "Creating Safe Profile..."
                : "Create Safe Profile →"}
            </button>

            {alertMessage && (
              <div className="small-alert">{alertMessage}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // DASHBOARD
  // -----------------------------

  if (screen === "dashboard") {
    return (
      <div className="app">
        <Navbar
          onHome={() => setScreen("home")}
          onDashboard={() => setScreen("dashboard")}
        />

        <div className="dashboard-container">
          <div className="dashboard-header">
            <div>
              <div className="eyebrow">TOURIST DASHBOARD</div>
              <h1>
                Welcome{user.name ? `, ${user.name}` : ""}
              </h1>
              <p>
                Plan your journey and let SafarSuraksha monitor
                your safety.
              </p>
            </div>

            <button
              className="id-button"
              onClick={() => setShowDigitalId(true)}
            >
              🪪 Digital Tourist ID
            </button>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-main">
              <div className="destination-card">
                <div>
                  <span className="label">DESTINATION</span>
                  <h2>
                    {user.destination || "Jaipur City Palace"}
                  </h2>
                  <p>
                    Select a destination to compare safety-aware
                    routes.
                  </p>
                </div>

                <button
                  className="primary-btn"
                  onClick={() => setScreen("routes")}
                >
                  Find Safe Routes →
                </button>
              </div>

              <div className="stats-grid">
                <Stat
                  icon="🛡️"
                  number="92%"
                  label="Safe Route Score"
                />
                <Stat
                  icon="📍"
                  number="24/7"
                  label="Monitoring"
                />
                <Stat
                  icon="🚨"
                  number="<30s"
                  label="SOS Response Target"
                />
                <Stat
                  icon="👮"
                  number="LIVE"
                  label="Authority Network"
                />
              </div>
            </div>

            <div className="monitor-card">
              <div className="card-heading">
                <span>SAFETY MONITOR</span>
                <span className="online-dot">● ONLINE</span>
              </div>

              <div className="monitor-icon">🛡️</div>

              <h2>You're protected</h2>

              <p>
                SafarSuraksha will monitor your planned route,
                detect deviations and respond to emergencies.
              </p>

              <div className="monitor-item">
                <span>Location</span>
                <strong>
                  {locationAllowed ? "Active" : "Pending"}
                </strong>
              </div>

              <div className="monitor-item">
                <span>Emergency Contact</span>
                <strong>
                  {user.emergencyContact
                    ? "Added"
                    : "Not Added"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {showDigitalId && (
          <DigitalId
            user={user}
            touristId={touristId}
            onClose={() => setShowDigitalId(false)}
          />
        )}
      </div>
    );
  }

  // -----------------------------
  // ROUTES
  // -----------------------------

  if (screen === "routes") {
    return (
      <div className="app">
        <Navbar
          onHome={() => setScreen("home")}
          onDashboard={() => setScreen("dashboard")}
        />

        <div className="page-container wide">
          <div className="eyebrow">STEP 02 • ROUTE INTELLIGENCE</div>

          <h1>Choose the safer way to travel.</h1>

          <p className="muted">
            SafarSuraksha doesn't only show the fastest route.
            It explains which route provides better safety.
          </p>

          <div className="route-layout">
            <div className="route-list">
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={selectedRoute.id === route.id}
                  onSelect={() => setSelectedRoute(route)}
                />
              ))}

              <div className="ai-explanation">
                <div className="ai-title">
                  🤖 Why is this route safer?
                </div>

                <h3>{selectedRoute.name}</h3>

                <p>
                  This route receives a{" "}
                  <strong>{selectedRoute.score}%</strong>{" "}
                  safety score because it has better access to
                  emergency services and public activity.
                </p>

                <div className="reason-list">
                  {selectedRoute.reasons.map((reason) => (
                    <div key={reason}>✓ {reason}</div>
                  ))}
                </div>
              </div>

              <button
                className="primary-btn full-btn"
                onClick={startJourney}
                disabled={startingJourney}
              >
                {startingJourney
                  ? "Starting Journey..."
                  : "Start This Safe Journey →"}
              </button>
            </div>

            <div className="map-panel">
              <MapView
                routeDeviation={false}
                incidentWarning={false}
                distanceFromRoute={0}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // TRACKING
  // -----------------------------

  if (screen === "tracking") {
    return (
      <div className="app tracking-page">
        <Navbar
          onHome={() => setScreen("home")}
          onDashboard={() => setScreen("dashboard")}
        />

        <div className="tracking-container">
          <div className="tracking-top">
            <div>
              <div className="eyebrow">
                LIVE JOURNEY MONITORING
              </div>

              <h1>Your journey is protected.</h1>

              <p>
                {selectedRoute.distance} •{" "}
                {selectedRoute.time} • Safety score{" "}
                {selectedRoute.score}%
              </p>
            </div>

            <div className="live-badge">
              <span>●</span> LIVE MONITORING
            </div>
          </div>

          <div className="tracking-layout">
            <div className="live-map">
              <MapView
                routeDeviation={routeDeviation}
                incidentWarning={incidentWarning}
                distanceFromRoute={distanceFromRoute}
              />

              <div className="map-overlay">
                <div>
                  <span>DESTINATION</span>
                  <strong>
                    {user.destination || "Jaipur City Palace"}
                  </strong>
                </div>

                <div>
                  <span>ROUTE</span>
                  <strong>{selectedRoute.score}% SAFE</strong>
                </div>
              </div>
            </div>

            <div className="tracking-sidebar">
              <div className="status-card">
                <div className="status-header">
                  <span>JOURNEY STATUS</span>
                  <span className="green-text">● ACTIVE</span>
                </div>

                <div className="journey-progress">
                  <div className="progress-line">
                    <div className="progress-fill" />
                  </div>

                  <div className="progress-labels">
                    <span>START</span>
                    <span>DESTINATION</span>
                  </div>
                </div>

                <div className="monitor-row">
                  <span>📍 GPS</span>
                  <strong>{gpsActive ? "ACTIVE" : "WAITING"}</strong>
                </div>

                <div className="monitor-row">
                  <span>🛡️ Risk Monitor</span>
                  <strong>ACTIVE</strong>
                </div>

                <div className="monitor-row">
                  <span>👮 Responder Network</span>
                  <strong>CONNECTED</strong>
                </div>

                {currentLocation && (
                  <div className="monitor-row">
                    <span>📡 Current GPS</span>
                    <strong>LIVE</strong>
                  </div>
                )}
              </div>
                            {/* AI RISK STATUS */}

              <div className="risk-status-card">
                <div className="risk-status-header">
                  <span>🤖 AI RISK MONITOR</span>

                  <strong
                    className={
                      riskLevel === "HIGH"
                        ? "risk-high"
                        : riskLevel === "MEDIUM"
                        ? "risk-medium"
                        : "risk-low"
                    }
                  >
                    ● {riskLevel} RISK
                  </strong>
                </div>

                <p>
                  {riskLevel === "HIGH"
                    ? `⚠️ ${riskZoneName} detected near your route.`
                    : "AI is continuously monitoring nearby risk zones."}
                </p>
              </div>

              {/* INCIDENT WARNING */}

              {incidentWarning && (
                <div className="incident-alert">
                  <div className="alert-icon">⚠️</div>

                  <div>
                    <strong>RISK ZONE AHEAD</strong>

                    <p>
                      AI detected an incident hotspot near your
                      route.
                    </p>
                  </div>
                </div>
              )}

              {/* ROUTE DEVIATION */}

              {routeDeviation && (
                <div className="deviation-alert">
                  <div className="alert-top">
                    <div className="warning-circle">!</div>

                    <div>
                      <strong>ROUTE DEVIATION DETECTED</strong>
                      <p>
                        You are{" "}
                        <strong>
                          {distanceFromRoute.toFixed(2)} km
                        </strong>{" "}
                        away from your planned route.
                      </p>
                    </div>
                  </div>

                  <div className="distance-box">
                    <span>DISTANCE FROM SAFE ROUTE</span>
                    <strong>
                      {distanceFromRoute.toFixed(2)} km
                    </strong>
                  </div>

                  <p className="safe-question">
                    Are you safe?
                  </p>

                  <div className="alert-actions">
                    <button
                      className="safe-btn"
                      onClick={markSafe}
                    >
                      ✓ I'm Safe
                    </button>

                    <button
                      className="help-btn"
                      onClick={requestHelp}
                    >
                      🚨 I Need Help
                    </button>
                  </div>

                  <button
                    className="small-action"
                    onClick={increaseDeviation}
                  >
                    Simulate moving farther from route
                  </button>
                </div>
              )}

              {/* SOS */}

              {sosActive && (
                <div className="sos-card">
                  <div className="sos-pulse">🚨</div>

                  <h2>SOS ACTIVE</h2>

                  <p>
                    Emergency alert has been activated.
                    Your current location is being shared.
                  </p>

                  <div className="sos-status">
                    <div>✓ Emergency contact notified</div>
                    <div>✓ Location shared</div>
                    <div>✓ Nearest responder identified</div>
                    <div>✓ Authority dashboard updated</div>
                  </div>

                  <button
                    className="cancel-sos"
                    onClick={deactivateSOS}
                  >
                    Cancel SOS
                  </button>
                </div>
              )}

              {/* SOUND */}

              <div className="sound-card">
                <div>
                  <strong>🔊 Emergency Alert Sound</strong>
                  <p>
                    Play sound when a safety alert is triggered.
                  </p>
                </div>

                <button
                  className={
                    soundOn
                      ? "toggle active"
                      : "toggle"
                  }
                  onClick={() => setSoundOn(!soundOn)}
                >
                  {soundOn ? "ON" : "OFF"}
                </button>
              </div>

              {/* DEMO CONTROLS */}

              <div className="demo-controls">
                <span>DEMO CONTROLS</span>

                <button
                  onClick={showIncidentWarning}
                  className="demo-button"
                >
                  ⚠️ Simulate Risk Zone
                </button>

                <button
                  onClick={simulateDeviation}
                  className="demo-button danger"
                >
                  📍 Simulate Route Deviation
                </button>

                {!routeDeviation && !sosActive && (
                  <div className="demo-hint">
                    Use the buttons above to demonstrate the
                    emergency flow to judges.
                  </div>
                )}
              </div>

              {alertMessage && (
                <div className="system-message">
                  <strong>SafarSuraksha</strong>
                  <span>{alertMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // AUTHORITY DASHBOARD
  // -----------------------------

  return (
    <div className="app authority-page">
      <Navbar
        onHome={() => setScreen("home")}
        onDashboard={() => setScreen("dashboard")}
      />

      <div className="authority-container">
        <div className="authority-header">
          <div>
            <div className="eyebrow">
              AUTHORITY RESPONSE CENTRE
            </div>

            <h1>Tourist Safety Command Dashboard</h1>

            <p>
              Monitor tourists, identify risk zones and respond
              to emergencies.
            </p>
          </div>

          <div className="live-badge">
            <span>●</span> SYSTEM ONLINE
          </div>
        </div>

        <div className="authority-stats">
          <Stat
            icon="👥"
            number="128"
            label="Tourists Monitored"
          />

          <Stat
            icon="🟢"
            number="121"
            label="Safe Journeys"
          />

          <Stat
            icon="⚠️"
            number="05"
            label="Risk Alerts"
          />

          <Stat
            icon="🚨"
            number={sosActive ? "01" : "00"}
            label="Active SOS"
          />
        </div>

        <div className="authority-grid">
          <div className="authority-map">
            <div className="authority-map-title">
              LIVE TOURIST SAFETY MAP
            </div>

            <div className="fake-authority-map">
              <div className="map-grid-lines" />

              <div className="risk-zone zone-one">
                ⚠️ Risk Zone
              </div>

              <div className="risk-zone zone-two">
                ⚠️ Risk Zone
              </div>

              <div className="tourist-point point-one">●</div>
              <div className="tourist-point point-two">●</div>
              <div className="tourist-point point-three">●</div>
              <div className="tourist-point point-four">●</div>

              {sosActive && (
                <div className="sos-location">
                  🚨 SOS LOCATION
                </div>
              )}
            </div>
          </div>

          <div className="incident-panel">
            <div className="card-heading">
              <span>LIVE INCIDENTS</span>
              <span className="green-text">● LIVE</span>
            </div>

            <Incident
              level="HIGH"
              title="Tourist route deviation"
              location="Jaipur City"
              active={sosActive}
            />

            <Incident
              level="MEDIUM"
              title="Low activity zone detected"
              location="Amber Road"
            />

            <Incident
              level="LOW"
              title="Traffic congestion"
              location="MI Road"
            />

            <button
              className="primary-btn full-btn"
              onClick={() => setScreen("tracking")}
            >
              Open Tourist Monitoring →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTS
// ========================================

function Navbar({ onHome, onDashboard }) {
  return (
    <nav className="navbar">
      <button className="brand" onClick={onHome}>
        <span className="brand-shield">🛡️</span>
        <span>
          <strong>Safar</strong>Suraksha
        </span>
      </button>

      <div className="nav-links">
        <button onClick={onHome}>Home</button>
        <button onClick={onDashboard}>Tourist Dashboard</button>
      </div>

      <div className="system-online">
        <span>●</span> SYSTEM ONLINE
      </div>
    </nav>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div className="feature-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, text }) {
  return (
    <div className="info-card">
      <div className="info-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>

      <span className="learn-more">Learn more →</span>
    </div>
  );
}

function Stat({ icon, number, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <strong>{number}</strong>

      <span>{label}</span>
    </div>
  );
}

function RouteCard({ route, selected, onSelect }) {
  return (
    <button
      className={
        selected
          ? "route-card selected"
          : "route-card"
      }
      onClick={onSelect}
    >
      <div className="route-top">
        <div>
          <span className="route-label">
            {route.id === "safe"
              ? "RECOMMENDED"
              : "ALTERNATIVE"}
          </span>

          <h3>{route.name}</h3>
        </div>

        <div className="route-score">
          <strong>{route.score}%</strong>
          <span>{route.level}</span>
        </div>
      </div>

      <div className="route-meta">
        <span>📍 {route.distance}</span>
        <span>⏱️ {route.time}</span>
      </div>

      <div className="route-reasons">
        {route.reasons.slice(0, 3).map((reason) => (
          <span key={reason}>✓ {reason}</span>
        ))}
      </div>
    </button>
  );
}

function DigitalId({ user, touristId, onClose }) {
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ cursor: "pointer" }}
    >
      <div
        className="digital-id"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", cursor: "default" }}
      >
        <button
          type="button"
          aria-label="Close Digital Tourist ID"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("CLOSE BUTTON CLICKED");
            onClose();
          }}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "42px",
            height: "42px",
            zIndex: 999999,
            cursor: "pointer",
            pointerEvents: "auto",
            border: "none",
            background: "transparent",
            fontSize: "28px",
            fontWeight: "bold",
            lineHeight: "42px",
            padding: 0,
          }}
        >
          ×
        </button>

        <div className="id-header">
          <span>🛡️</span>
          <strong>SafarSuraksha</strong>
        </div>

        <div className="id-title">DIGITAL TOURIST ID</div>

        <div className="qr-box">
          <div className="fake-qr">
            █ ▄ █ ▀ ▄ █
            <br />
            ▄ █ ▀ █ ▄ ▀
            <br />
            █ ▀ ▄ █ ▀ █
            <br />
            ▀ █ ▄ ▀ █ ▄
          </div>
        </div>

        <div className="id-details">
          <span>TOURIST ID</span>
          <strong>{touristId || "SS-2026-DEMO"}</strong>

          <span>TOURIST NAME</span>
          <strong>{user.name || "Demo Tourist"}</strong>

          <span>PHONE</span>
<strong>{user.phone || "Not available"}</strong>

<span>EMERGENCY CONTACT</span>
<strong>{user.emergencyContact || "Not available"}</strong>

<span>DESTINATION</span>
<strong>{user.destination || "Jaipur"}</strong>

<span>STATUS</span>
          

        
          <strong className="green-text">
            VERIFIED • ACTIVE
          </strong>
        </div>

        <div className="id-footer">
          Secure • Time Limited • Shareable
        </div>
      </div>
    </div>
  );
}

function Incident({
  level,
  title,
  location,
  active = false,
}) {
  return (
    <div
      className={
        active
          ? "incident active-incident"
          : "incident"
      }
    >
      <div
        className={`incident-level ${level.toLowerCase()}`}
      >
        {level}
      </div>

      <div>
        <strong>{title}</strong>
        <span>📍 {location}</span>
      </div>

      <span className="incident-time">NOW</span>
    </div>
  );
}

export default App;