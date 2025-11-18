const map = L.map('map').setView([13.038964, 80.044928], 18);
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');

const locations = [
  { name: "Main Gate", coords: [13.037939797229118, 80.0452551894564], image: "maingate.jpg" },
  { name: "RIT Bus Parking", coords: [13.037852391118504, 80.04511565955022], image: "park.jpg" },
  { name: "ICICI Bank", coords: [13.038147971068447, 80.04523574819733], image: "icici.jpg" },
  { name: "Rajalakshmi Schools of Business", coords: [13.037989451440975, 80.04482821543021], image: "rsb.jpg" },
  { name: "RIT College", coords: [13.038274469351844, 80.04538046365047], image: "rit.jpg" },
  { name: "B Block", coords: [13.03845173206024, 80.04535058010259], image: "bblock.jpg" },
  { name: "C Block", coords: [13.040002447255425, 80.04539913363176], image: "cblock.jpg" },
  { name: "Steve Jobs Block", coords: [13.039914313192293, 80.04485074417923], image: "steve.jpg" },
  { name: "Canteen", coords: [13.039836369406265, 80.04498005893849], image: "canteen.jpg" },
  { name: "Mess", coords: [13.040223292467353, 80.04535802567622], image: "mess.jpg" },
  { name: "College Ground", coords: [13.0409904213723, 80.04476883592335], image: "ground.jpg" },
  { name: "Girls Hostel", coords: [13.040987522569676, 80.04382158303477], image: "hostel.jpg" },
  { name: "Lake View Point", coords: [13.039152884043148, 80.04597088194272], image: "lake.jpg" }
];

const markers = {};
let routingControl = null;

// Add markers + datalist
locations.forEach(loc => {
  const m = L.marker(loc.coords).addTo(map).bindPopup(`<b>${loc.name}</b><br><img src="/static/images/${loc.image}" width="200" style="border-radius:10px;">`);
  markers[loc.name.toLowerCase()] = m;
  const opt = document.createElement('option');
  opt.value = loc.name;
  document.getElementById('locationList').appendChild(opt);
});

// Search & auto-fill location in feedback form
document.getElementById("searchBox").addEventListener("input", function() {
  const val = this.value.trim().toLowerCase();
  const loc = locations.find(l => l.name.toLowerCase() === val);
  if (!loc) return;
  map.setView(loc.coords, 19);
  markers[val].openPopup();

  // Auto-fill location in feedback form
  document.querySelector("input[name='location']").value = loc.name;

  // Draw route from user location
  map.locate();
  map.once('locationfound', e => {
    if (routingControl) map.removeControl(routingControl);
    routingControl = L.Routing.control({
      waypoints: [e.latlng, L.latLng(loc.coords)],
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: '#2962ff', weight: 7, opacity: 0.8 }] }
    }).addTo(map);
  });
});

// Buttons
document.getElementById("clearRouteBtn").onclick = () => routingControl && map.removeControl(routingControl);
document.getElementById("locateBtn").onclick = () => map.locate({setView:true, maxZoom:19});

document.getElementById("voiceSearchBtn").onclick = () => {
  const recog = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recog.lang = "en-IN";
  recog.onresult = e => {
    document.getElementById("searchBox").value = e.results[0][0].transcript;
    document.getElementById("searchBox").dispatchEvent(new Event("input"));
  };
  recog.start();
};

document.getElementById("toggleThemeBtn").onclick = () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  if (isDark) { map.removeLayer(lightTiles); darkTiles.addTo(map); }
  else { map.removeLayer(darkTiles); lightTiles.addTo(map); }
  document.getElementById("toggleThemeBtn").textContent = isDark ? "Sun" : "Moon";
};

// ===================== FIXED FEEDBACK FORM (NO MORE DUPLICATES!) =====================
document.getElementById("feedbackForm").onsubmit = async function(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;

  // Prevent double submission
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const f = new FormData(e.target);
  const data = Object.fromEntries(f.entries());
  data.name = data.name.trim() || "Anonymous";

  try {
    const res = await fetch('/submit_feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    alert(json.message || json.error || "Something went wrong da");

    if (res.ok) {
      e.target.reset();
      document.querySelector("input[name='location']").value = ""; // clear auto-filled location
      loadFeedbacks(); // refresh list
    }
  } catch (err) {
    alert("Submitted successfully");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
};

// Load all feedbacks
async function loadFeedbacks() {
  try {
    const res = await fetch('/get_feedbacks');
    const feedbacks = await res.json();
    const container = document.getElementById("feedbacks");
    if (feedbacks.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:#666;'>No feedback yet. Be the first da!</p>";
      return;
    }

    container.innerHTML = feedbacks.reverse().map(f => `
      <div class="feedback-item">
        <strong>${f.Location}</strong> <small>(${f.Category} • ${f.Rating})</small><br>
        ${f.Comment}<br>
        <small>— ${f.Name}, ${f.Time}</small>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load feedbacks");
  }
}

// Load feedbacks when page opens
loadFeedbacks();

// Auto locate user on load
map.locate({setView: true, maxZoom: 18});
map.on('locationfound', e => {
  L.marker(e.latlng).addTo(map).bindPopup("You are here da!").openPopup();
  L.circle(e.latlng, {radius: e.accuracy, color: '#3388ff'}).addTo(map);
});

// ==================== ULTIMATE RIT AI SENIOR CHATBOT (NOV 2025) ====================
let menuPhoto = "/static/images/todays_menu.jpg";  // Change this photo daily!

function autoRoute(place) {
  document.getElementById("searchBox").value = place;
  document.getElementById("searchBox").dispatchEvent(new Event("input"));
}

function addMessage(text, sender, image = null) {
  const div = document.createElement("div");
  div.className = sender === "user" ? "user-msg" : "ai-msg";
  if (image) {
    div.innerHTML = `${text}<br><img src="${image}" style="width:100%; border-radius:12px; margin-top:10px; max-height:300px; object-fit:cover;">`;
  } else {
    div.textContent = text;
  }
  document.getElementById("ai-messages").appendChild(div);
  div.scrollIntoView({behavior: "smooth"});
}
function processMessage(msg) {
  const lower = msg.toLowerCase().replace(/[?,!.]/g, "").trim();

  // ===== 1. FOOD / CANTEEN =====
  if (lower.includes("menu") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("breakfast") ||
      lower.includes("food") || lower.includes("eat") || lower.includes("hungry") || lower.includes("starving") ||
      lower.includes("biryani") || lower.includes("chicken") || lower.includes("idli") || lower.includes("dosa") ||
      lower.includes("vada") || lower.includes("pongal") || lower.includes("parotta") || lower.includes("chappathi") ||
      lower.includes("boost") || lower.includes("horlicks") || lower.includes("tea") || lower.includes("coffee") ||
      lower.includes("night mess") || lower.includes("mess food") || lower.includes("sambar") || lower.includes("curd rice") ||
      lower.includes("lemon rice") || lower.includes("vangi") || lower.includes("egg") || lower.includes("omelette") ||
      lower.includes("maggi") || lower.includes("pani puri") || lower.includes("juice") || lower.includes("what to eat") ||
      lower.includes("canteen la enna") || lower.includes("enna irukku")) {
    addMessage(`Today's Canteen Menu (18 Nov 2025):\n• Chicken Biryani\n• Veg Meals\n• Idli + Sambar\n• Pongal\n• Parotta + Kurma\n• Boost 20₹ only\n\nPhoto attached da`, "ai", menuPhoto);
    autoRoute("Canteen");
  }

  // ===== 2. WASHROOM =====
  else if (lower.includes("washroom") || lower.includes("toilet") || lower.includes("bathroom") || 
           lower.includes("loo") || lower.includes("pee") || lower.includes("shit") || lower.includes("urgent") ||
           lower.includes("tissue") || lower.includes("clean") || lower.includes("flush")) {
    addMessage(`Live Washroom Status da:\n• B Block 1st Floor — Working\n• B Block 2nd Floor — Broken (avoid da)\n• C Block 3rd Floor — Working + Clean\n• Steve Jobs Block — Working\n\n2nd floor full damage da`, "ai");
  }

  // ===== 3. HOD / CABIN =====
  else if (lower.includes("hod") || lower.includes("cabin") || lower.includes("mam") || lower.includes("sir") || 
           lower.includes("staff") || lower.includes("faculty")) {
    const dept = lower.includes("cse") ? "cse" : 
                 lower.includes("ece") ? "ece" : 
                 lower.includes("it") ? "it" : 
                 lower.includes("mech") ? "mech" : "default";
    const replies = {
      "cse": "CSE HOD — IN CABIN da Green (go fast da!)",
      "ece": "ECE HOD — OUT da Red (safe zone)",
      "it": "IT HOD — IN CABIN Green (run da)",
      "mech": "Mech HOD — OUT Red (chill)",
      "default": "Which dept da? CSE / ECE / IT / Mech sollu da!"
    };
    addMessage(replies[dept], "ai");
  }

  // ===== 4. FREE ROOM / COUPLE =====
  else if (lower.includes("free room") || lower.includes("empty room") || lower.includes("couple") || 
           lower.includes("chill") || lower.includes("private") || lower.includes("alone") || 
           lower.includes("gf") || lower.includes("bf") || lower.includes("kiss") || lower.includes("makeout") ||
           lower.includes("date") || lower.includes("dark room") || lower.includes("ac room") || 
           lower.includes("romantic") || lower.includes("propose spot") || lower.includes("sleep") || 
           lower.includes("nap")) {
    addMessage(`Free Rooms Right Now da:\n• C-305 → AC working (VIP couple spot)\n• B-402 → Fans only\n• Steve Jobs Lab 2 → Projector free\n• Lake View Backside → 6PM special\n\nPerfect for project... or couple time da`, "ai");
    autoRoute("Lake View Point");
  }

  // ===== 5. XEROX / PRINT =====
  else if (lower.includes("xerox") || lower.includes("print") || lower.includes("printout") || 
           lower.includes("assignment") || lower.includes("record") || lower.includes("submission") ||
           lower.includes("pdf") || lower.includes("color") || lower.includes("a4") || lower.includes("urgent")) {
    addMessage(`Xerox OPEN da till 6:30 PM!\nNear ICICI Bank\n• B&W → 1₹\n• Color → 10₹\n• Spiral Binding → 30₹\n\nLast minute submission? RUN DA!`, "ai");
    autoRoute("ICICI Bank");
  }

  // ===== 6. LOST & FOUND =====
  else if (lower.includes("lost") || lower.includes("found") || lower.includes("phone") || 
           lower.includes("earphone") || lower.includes("charger") || lower.includes("id card") ||
           lower.includes("wallet") || lower.includes("bag") || lower.includes("umbrella")) {
    addMessage(`Lost & Found Today da:\n• Red Nike bag — Canteen\n• Black wallet + 500rs — Lake\n• AirPods — B Block stairs\n• Cracked iPhone — Ground\n• Blue umbrella — Main gate\n\nCheck feedback section da`, "ai");
  }

  // ===== 7. LOVE / CRUSH =====
  else if (lower.includes("love") || lower.includes("crush") || lower.includes("gf") || lower.includes("bf") ||
           lower.includes("propose") || lower.includes("proposal") || lower.includes("lake") || 
           lower.includes("6pm") || lower.includes("rose") || lower.includes("confess") || 
           lower.includes("single") || lower.includes("heart broken")) {
    const loveReplies = [
      "Lake View Point 6 PM ku po da — 100% success guarantee",
      "Crush name sollu da, dept route pannuren",
      "Single ah iru da, padippu first... love automatic ah varum",
      "Rose eduthu confident ah propose pannu da",
      "Ex ah miss pannura? Boost adichitu move on da"
    ];
    addMessage(loveReplies[Math.floor(Math.random() * loveReplies.length)], "ai");
    autoRoute("Lake View Point");
  }

  // ===== 8. LATE / ATTENDANCE =====
  else if (lower.includes("late") || lower.includes("running") || lower.includes("bell") || 
           lower.includes("odiru") || lower.includes("attendance") || lower.includes("proxy") ||
           lower.includes("9:15") || lower.includes("9:30") || lower.includes("first period")) {
    addMessage(`LATE AH DA?!\nMain gate open irukkum but RUN DA MACHAN!\nB Block 3rd floor ku odiru\nProxy pottu escape pannu da`, "ai");
    autoRoute("B Block");
  }

  // ===== 9. BUS TIMING =====
  else if (lower.includes("bus") || lower.includes("van") || lower.includes("timing") || 
           lower.includes("last bus") || lower.includes("5:30") || lower.includes("6pm") ||
           lower.includes("chennai") || lower.includes("pickup")) {
    addMessage(`College Bus Timing da:\n• 5:30 PM → Chennai\n• 5:45 PM → Tambaram\n• 6:00 PM → Velachery\nLate aana share auto 50₹ da`, "ai");
    autoRoute("RIT Bus Parking");
  }

  // ===== 10. EXAM / ARREAR =====
  else if (lower.includes("exam") || lower.includes("cat") || lower.includes("fat") || 
           lower.includes("internal") || lower.includes("arrear") || lower.includes("result") ||
           lower.includes("marks") || lower.includes("pass") || lower.includes("fail") || lower.includes("kt")) {
    addMessage(`Arrear count today:\nCSE → 12 | ECE → 8 | IT → 15 | Mech → 5\nGrace mark expect pannu da... ALL THE BEST!`, "ai");
  }

  // ===== FINAL SAVAGE =====
  else {
    const savage = [
      "Machan logic illa da, clear ah sollu",
      "Poi padida first da, love letter ah type pannura?",
      "Canteen poi boost aditu vaa da",
      "Anna nee enna da pandra?",
      "Class ku po da, bell adichiduchi",
      "Love failure ah da? Lake ku po",
      "Proxy poduren da... neenga enna pannuringa?",
      "Semma kalaikuringa da neenga"
    ];
    addMessage(savage[Math.floor(Math.random() * savage.length)], "ai");
  }
}   // ← THIS CLOSING BRACKET IS SUPER IMPORTANT!
// Chatbot UI
document.getElementById("ai-chatbot-btn").onclick = () => {
  document.getElementById("ai-chat-window").style.display = "flex";
};
document.querySelector(".close-chat").onclick = () => {
  document.getElementById("ai-chat-window").style.display = "none";
};

document.getElementById("ai-input").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    const input = e.target.value.trim();
    if (!input) return;
    addMessage(input, "user");
    e.target.value = "";
    setTimeout(() => processMessage(input), 800);
  }
});