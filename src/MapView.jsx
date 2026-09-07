import { useEffect, useState } from "react";

function MapView({
  routeDeviation = false,
  incidentWarning = false,
  distanceFromRoute = 0,
}) {
  const [position, setPosition] = useState({
    x: 18,
    y: 78,
  });

  useEffect(() => {
    if (!routeDeviation) {
      setPosition({
        x: 18,
        y: 78,
      });
      return;
    }

    setPosition({
      x: 53,
      y: 42,
    });
  }, [routeDeviation]);

  return (
    <div className="map-view">
      <div className="map-background">
        <div className="road road-1" />
        <div className="road road-2" />
        <div className="road road-3" />
        <div className="road road-4" />

        <div className="building building-1" />
        <div className="building building-2" />
        <div className="building building-3" />
        <div className="building building-4" />
        <div className="building building-5" />

        <div className="park park-1">
          <span>PUBLIC PARK</span>
        </div>

        <div className="hospital">
          🏥
          <span>Hospital</span>
        </div>

        <div className="police">
          👮
          <span>Police</span>
        </div>

        <svg
          className="route-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M 10 85 C 25 75, 25 55, 40 50 C 55 45, 60 28, 90 18"
            fill="none"
            stroke="#1765d1"
            strokeWidth="1.6"
            strokeDasharray="2 1"
          />

          {routeDeviation && (
            <path
              d="M 53 42 C 64 48, 70 58, 82 67"
              fill="none"
              stroke="#df3737"
              strokeWidth="1.5"
              strokeDasharray="2 1"
            />
          )}
        </svg>

        <div
          className={
            routeDeviation
              ? "user-location deviated"
              : "user-location"
          }
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
          }}
        >
          <span>●</span>
        </div>

        <div className="destination-marker">
          📍
          <span>Destination</span>
        </div>

        {incidentWarning && (
  <div className="map-risk-zone high-risk-zone">
    <div>⚠️</div>
    <strong>HIGH RISK</strong>
    <span>AI Incident Hotspot</span>
  </div>
)}

        {routeDeviation && (
          <div className="deviation-line-label">
            {distanceFromRoute.toFixed(2)} km away
          </div>
        )}
      </div>

      <div className="map-legend">
        <div>
          <span className="legend-blue" />
          Safe Route
        </div>

        <div>
          <span className="legend-red" />
          Deviation
        </div>

        <div>
          <span className="legend-orange" />
          Risk Zone
        </div>
      </div>

      <style>{`
        .map-view {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 500px;
          overflow: hidden;
          background: #dfe9e3;
        }

        .map-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            linear-gradient(
              35deg,
              transparent 47%,
              rgba(255,255,255,.8) 48%,
              rgba(255,255,255,.8) 51%,
              transparent 52%
            ),
            linear-gradient(
              145deg,
              transparent 47%,
              rgba(255,255,255,.75) 48%,
              rgba(255,255,255,.75) 51%,
              transparent 52%
            ),
            #dce8df;
        }

        .road {
          position: absolute;
          background: rgba(255,255,255,.88);
          border: 1px solid rgba(190,201,195,.55);
        }

        .road-1 {
          width: 115%;
          height: 27px;
          top: 48%;
          left: -5%;
          transform: rotate(-16deg);
        }

        .road-2 {
          width: 110%;
          height: 22px;
          top: 28%;
          left: -4%;
          transform: rotate(23deg);
        }

        .road-3 {
          width: 120%;
          height: 18px;
          top: 72%;
          left: -7%;
          transform: rotate(9deg);
        }

        .road-4 {
          width: 20px;
          height: 120%;
          top: -10%;
          left: 67%;
          transform: rotate(18deg);
        }

        .building {
          position: absolute;
          border-radius: 4px;
          background: #c9d8d0;
          border: 1px solid #b9c9c0;
        }

        .building-1 {
          width: 80px;
          height: 55px;
          left: 8%;
          top: 14%;
        }

        .building-2 {
          width: 95px;
          height: 45px;
          right: 8%;
          top: 15%;
        }

        .building-3 {
          width: 70px;
          height: 75px;
          left: 12%;
          bottom: 12%;
        }

        .building-4 {
          width: 110px;
          height: 55px;
          right: 17%;
          bottom: 18%;
        }

        .building-5 {
          width: 65px;
          height: 45px;
          left: 43%;
          top: 10%;
        }

        .park {
          position: absolute;
          width: 145px;
          height: 100px;
          right: 29%;
          bottom: 9%;
          border-radius: 45%;
          background: #b9d7b7;
          border: 2px solid #a7c8a5;
          display: grid;
          place-items: center;
          color: #527456;
          font-size: 8px;
          font-weight: 800;
        }

        .hospital,
        .police {
          position: absolute;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,.93);
          box-shadow: 0 4px 12px rgba(0,0,0,.08);
          font-size: 15px;
        }

        .hospital {
          left: 29%;
          top: 24%;
        }

        .police {
          right: 18%;
          top: 41%;
        }

        .hospital span,
        .police span {
          display: block;
          margin-top: 3px;
          color: #63758a;
          font-size: 8px;
          font-weight: 700;
        }

        .route-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .user-location {
          position: absolute;
          width: 27px;
          height: 27px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(23,101,209,.18);
          display: grid;
          place-items: center;
          transition: all .5s ease;
        }

        .user-location span {
          width: 12px;
          height: 12px;
          display: grid;
          place-items: center;
          border: 3px solid white;
          border-radius: 50%;
          background: #1765d1;
          color: transparent;
          box-shadow: 0 2px 8px rgba(0,0,0,.2);
        }

        .user-location.deviated {
          background: rgba(223,55,55,.2);
        }

        .user-location.deviated span {
          background: #df3737;
        }

        .destination-marker {
          position: absolute;
          right: 8%;
          top: 11%;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #d22f2f;
          font-size: 22px;
        }

        .destination-marker span {
          margin-top: 2px;
          padding: 5px 7px;
          border-radius: 6px;
          background: rgba(255,255,255,.92);
          color: #53677d;
          font-size: 8px;
          font-weight: 800;
        }

        .map-risk-zone {
          position: absolute;
          left: 54%;
          top: 52%;
          width: 120px;
          height: 120px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px dashed #e28b35;
          background: rgba(240,161,72,.19);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #a76119;
          font-size: 18px;
          .high-risk-zone {
  border-color: #dc2626;
  background: rgba(220, 38, 38, 0.18);
  color: #b91c1c;
  animation: riskPulse 1.5s infinite;
}

.high-risk-zone strong {
  font-size: 10px;
  font-weight: 900;
  margin-bottom: 3px;
}

.high-risk-zone span {
  font-size: 8px;
  font-weight: 800;
}

@keyframes riskPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35);
  }

  70% {
    box-shadow: 0 0 0 15px rgba(220, 38, 38, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
  }
}
        }

        .map-risk-zone span {
          font-size: 9px;
          font-weight: 900;
        }

        .deviation-line-label {
          position: absolute;
          left: 56%;
          top: 38%;
          padding: 7px 10px;
          border-radius: 7px;
          background: #df3737;
          color: white;
          font-size: 9px;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
        }

        .map-legend {
          position: absolute;
          left: 15px;
          top: 15px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 9px;
          border-radius: 9px;
          background: rgba(255,255,255,.92);
          box-shadow: 0 4px 15px rgba(0,0,0,.07);
          font-size: 9px;
          color: #607388;
          font-weight: 700;
        }

        .map-legend div {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .map-legend span {
          width: 9px;
          height: 9px;
          display: inline-block;
          border-radius: 50%;
        }

        .legend-blue {
          background: #1765d1;
        }

        .legend-red {
          background: #df3737;
        }

        .legend-orange {
          background: #e28b35;
        }
      `}</style>
    </div>
  );
}

export default MapView;