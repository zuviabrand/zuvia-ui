import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc,
  deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const statusText = document.getElementById("statusText");

// Forms & elements
const fabricForm = document.getElementById("fabricForm");
const fabricIdInput = document.getElementById("fabricId");
const fabricNameInput = document.getElementById("fabricName");
const fabricColorInput = document.getElementById("fabricColor");
const fabricSupplierInput = document.getElementById("fabricSupplier");
const fabricMetersInput = document.getElementById("fabricMeters");
const fabricCostPerMeterInput = document.getElementById("fabricCostPerMeter");
const fabricDateInput = document.getElementById("fabricDate");
const fabricTableBody = document.getElementById("fabricTableBody");

const designForm = document.getElementById("designForm");
const designIdInput = document.getElementById("designId");
const designNameInput = document.getElementById("designName");
const designFabricSelect = document.getElementById("designFabricId");
const sizeXSInput = document.getElementById("sizeXS");
const sizeSInput = document.getElementById("sizeS");
const sizeMInput = document.getElementById("sizeM");
const sizeLInput = document.getElementById("sizeL");
const sizeXLInput = document.getElementById("sizeXL");
const fabricPerPieceInput = document.getElementById("designFabricPerPiece");
const designOtherCostInput = document.getElementById("designOtherCost");
const designTableBody = document.getElementById("designTableBody");

let state = { fabrics: [], designs: [] };

/* ------------ LOAD DATA FROM FIRESTORE ------------ */
async function loadFabrics() {
  const snap = await getDocs(collection(db, "fabrics"));
  state.fabrics = snap.docs.map(d => d.data());
}

async function loadDesigns() {
  const snap = await getDocs(collection(db, "designs"));
  state.designs = snap.docs.map(d => d.data());
}

async function initialLoad() {
  try {
    await loadFabrics();
    await loadDesigns();
    statusText.textContent = "Connected to Firebase ✔ Data loaded.";
    renderAll();
  } catch (e) {
    statusText.textContent = "Error loading data.";
    console.error(e);
  }
}

/* ---------------- FABRIC FORM ---------------- */
fabricForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fabric = {
    id: fabricIdInput.value.trim(),
    name: fabricNameInput.value.trim(),
    color: fabricColorInput.value.trim(),
    supplier: fabricSupplierInput.value.trim(),
    meters: parseFloat(fabricMetersInput.value),
    costPerMeter: parseFloat(fabricCostPerMeterInput.value),
    purchaseDate: fabricDateInput.value || null
  };

  if (!fabric.id || !fabric.name || isNaN(fabric.meters) || isNaN(fabric.costPerMeter)) {
    alert("Please fill Fabric ID, Name, Meters, and Cost/m.");
    return;
  }

  await setDoc(doc(db, "fabrics", fabric.id), fabric);
  await loadFabrics();
  renderAll();
  fabricForm.reset();
});

function renderFabrics() {
  fabricTableBody.innerHTML = "";
  state.fabrics.forEach(f => {
    const total = f.meters * f.costPerMeter;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.id}</td>
      <td>${f.name}</td>
      <td>${f.color || ""}</td>
      <td>${f.supplier || ""}</td>
      <td class="right">${f.meters.toFixed(2)}</td>
      <td class="right">${f.costPerMeter.toFixed(2)}</td>
      <td class="right">${total.toFixed(2)}</td>
      <td class="right">
        <button class="btn-danger" data-del-fabric="${f.id}">X</button>
      </td>
    `;
    fabricTableBody.appendChild(tr);
  });

  document.querySelectorAll("[data-del-fabric]").forEach(btn => {
    btn.onclick = async () => {
      const fabricIdToDelete = btn.dataset.delFabric;
      const inUse = state.designs.some(d => d.fabricId === fabricIdToDelete);
      if (inUse) {
        alert("This fabric is used in one or more designs. Delete those designs first, then delete the fabric.");
        return;
      }
      if (!confirm("Delete fabric " + fabricIdToDelete + "?")) return;
      await deleteDoc(doc(db, "fabrics", fabricIdToDelete));
      await loadFabrics();
      renderAll();
    };
  });
}

/* ---------------- DESIGN FORM ---------------- */
designForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const sizes = {
    XS: parseInt(sizeXSInput.value || "0", 10),
    S:  parseInt(sizeSInput.value  || "0", 10),
    M:  parseInt(sizeMInput.value  || "0", 10),
    L:  parseInt(sizeLInput.value  || "0", 10),
    XL: parseInt(sizeXLInput.value || "0", 10)
  };
  const pieces = Object.values(sizes).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0);

  if (!designIdInput.value.trim() ||
      !designNameInput.value.trim() ||
      !designFabricSelect.value ||
      pieces <= 0 ||
      !fabricPerPieceInput.value) {
    alert("Please fill Design ID, Name, Fabric, at least one size quantity, and Fabric per Piece.");
    return;
  }

  const d = {
    id: designIdInput.value.trim(),
    name: designNameInput.value.trim(),
    fabricId: designFabricSelect.value,
    sizes,
    pieces,
    fabricPerPiece: parseFloat(fabricPerPieceInput.value),
    otherCost: parseFloat(designOtherCostInput.value || "0")
  };

  await setDoc(doc(db, "designs", d.id), d);
  await loadDesigns();
  renderAll();
  designForm.reset();
});

function renderDesignFabricOptions() {
  designFabricSelect.innerHTML = `<option value="">Select fabric</option>`;
  state.fabrics.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = `${f.id} - ${f.name}`;
    designFabricSelect.appendChild(opt);
  });
}

function formatSizes(sizes) {
  if (!sizes) return "";
  const parts = [];
  for (const key of ["XS", "S", "M", "L", "XL"]) {
    const v = sizes[key] || 0;
    if (v > 0) parts.push(`${key}:${v}`);
  }
  return parts.join(" ");
}

function renderDesigns() {
  designTableBody.innerHTML = "";
  state.designs.forEach(d => {
    const f = state.fabrics.find(x => x.id === d.fabricId);
    const pieces = d.pieces || 0;
    const fabricPerPiece = d.fabricPerPiece || 0;
    const otherCost = d.otherCost || 0;
    const totalFabricUsed = pieces * fabricPerPiece;
    const costPerMeter = f ? f.costPerMeter : 0;
    const fabricCost = totalFabricUsed * costPerMeter;
    const totalCost = fabricCost + otherCost;
    const costPerPiece = pieces > 0 ? totalCost / pieces : 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${d.name}</td>
      <td>${d.fabricId} <span class="pill">${f ? f.name : "Unknown fabric"}</span></td>
      <td class="sizes-text">${formatSizes(d.sizes)}</td>
      <td class="right">${pieces}</td>
      <td class="right">${totalFabricUsed.toFixed(2)}</td>
      <td class="right">${fabricCost.toFixed(2)}</td>
      <td class="right">${otherCost.toFixed(2)}</td>
      <td class="right">${totalCost.toFixed(2)}</td>
      <td class="right">${costPerPiece.toFixed(2)}</td>
      <td class="right">
        <button class="btn-danger" data-del-design="${d.id}">X</button>
      </td>
    `;
    designTableBody.appendChild(tr);
  });

  document.querySelectorAll("[data-del-design]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.delDesign;
      if (!confirm("Delete design " + id + "?")) return;
      await deleteDoc(doc(db, "designs", id));
      await loadDesigns();
      renderAll();
    };
  });
}

/* ------------ RENDER ALL ---------------- */
function renderAll() {
  renderFabrics();
  renderDesignFabricOptions();
  renderDesigns();
}

/* ------------ TABS ---------------- */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

/* ------------ START ---------------- */
initialLoad();
