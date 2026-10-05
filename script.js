
const firebaseConfig = {
  apiKey: "AIzaSyBTtzq1S6svwLAq4T94XkqjUYKcQYt9LAw",
  authDomain: "item-data-gallery.firebaseapp.com",
  projectId: "item-data-gallery",
  storageBucket: "item-data-gallery.firebasestorage.app",
  messagingSenderId: "666612757567",
  appId: "1:666612757567:web:7ed94565e9bc66a7f5b48a",
  measurementId: "G-2M4JB9G20N"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const ITEMS_COLLECTION = "items";

// ================= ELEMENTS =================

const kodeSelector = document.getElementById("kodeSelector");
const kategoriSelector = document.getElementById("kategoriSelector");
const vendorSelector = document.getElementById("vendorSelector");
const itemDetail = document.getElementById("itemDetail");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const KodeSearch = document.getElementById("KodeSearch");
const excelFile = document.getElementById("excelFile");
const uploadExcelButton = document.getElementById("uploadExcelButton");
const deleteItemButton = document.getElementById("deleteItemButton");
const dataStatus = document.getElementById("dataStatus");


// ================= DATA =================
let data = {};
let filteredItems = [];
let currentIndex = 0;
let currentMode = "menu";

// ================= CLOCK =================
document.addEventListener("DOMContentLoaded", () => {
    updateClock();
    setInterval(updateClock, 1000);

});

function updateClock() {
    const now = new Date();
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    const timeEl = document.getElementById("clock-time");
    const dateEl = document.getElementById("clock-date");
    if (!timeEl || !dateEl) return;
    timeEl.textContent =
        now.toLocaleTimeString("en-US", {
            hour12: false
        });

    dateEl.textContent =
        `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}


// ================= HELPERS =================
function normalizeText(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value).trim();
}


function escapeHtml(value) {
    return normalizeText(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeHeader(value) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function readExcelValue(row, aliases) {
    const keys = Object.keys(row);
    for (const alias of aliases) {
        const wanted =
            normalizeHeader(alias);

        const found =
            keys.find(
                key =>
                    normalizeHeader(key) === wanted
            );

        if (found !== undefined) {
            return row[found];

        }

    }

    return "";
}


// ================= EXCEL ITEM =================
function excelRowToItem(row) {
    return {

        vendor:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "vendor",
                        "supplier"
                    ]
                )
            ),

        nama:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "nama",
                        "name",
                        "item name",
                        "itemname"
                    ]
                )
            ),

        kategori:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "kategori",
                        "category"
                    ]
                )
            ),

        subkategori:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "subkategori",
                        "subcategory",
                        "sub category"
                    ]
                )
            ),

        warna:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "warna",
                        "color"
                    ]
                )
            ),

        tier:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "tier",
                        "status"
                    ]
                )
            ),

        cbm:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "cbm"
                    ]
                )
            ),

        hts:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "hts",
                        "hts code",
                        "htscode"
                    ]
                )
            ),

        gambar:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "gambar",
                        "image",
                        "image url",
                        "imageurl",
                        "url gambar"
                    ]
                )
            ),

        keterangan:
            normalizeText(
                readExcelValue(
                    row,
                    [
                        "keterangan",
                        "description",
                        "descriptions"
                    ]
                )
            )

    };

}


function getExcelCode(row) {

    return normalizeText(
        readExcelValue(
            row,
            [
                "kode",
                "code",
                "item code",
                "itemcode",
                "item_code",
                "sku",
                "item"
            ]
        )
    ).toUpperCase();

}


// ================= STATUS =================
function setStatus(message, type = "info") {
    if (!dataStatus) return;
    dataStatus.textContent = message;
    dataStatus.className =
        `data-status ${type}`;

}

// ================= SORT =================
function sortedKeys() {

    return Object.keys(data).sort(
        (a, b) =>
            a.localeCompare(
                b,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            )
    );

}


// ================= RENDER OPTIONS =================

function renderOptions(
    select,
    placeholder,
    values
) {

    select.innerHTML =
        `<option value="">${placeholder}</option>`;

    values
        .filter(Boolean)
        .forEach(value => {

            const opt =
                document.createElement("option");

            opt.value = value;
            opt.textContent = value;
            select.appendChild(opt);

        });

}

// ========================================================
// FIRESTORE LOAD
// ========================================================

async function loadItemsFromFirestore() {
    try {

        setStatus(
            "Loading item data...",
            "info"
        );

        const snapshot =
            await db
                .collection(ITEMS_COLLECTION)
                .get();

        data = {};
        snapshot.forEach(doc => {
            const item =
                doc.data() || {};

            const code =
                normalizeText(
                    item.kode || doc.id
                ).toUpperCase();

            if (code) {

                data[code] = {
                    ...item,
                    kode: code
                };

            }

        });

        initDropdowns();
        resetGallery();
        setStatus(
            `${Object.keys(data).length.toLocaleString()} item loaded from Firestore.`,
            "success"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            `Failed to load Firestore: ${error.message}`,
            "error"
        );

        alert(
            "Firestore tidak dapat dibaca. " +
            "Periksa firebaseConfig dan Firestore Rules."
        );

    }

}


// ========================================================
// DROPDOWNS
// ========================================================
function initDropdowns() {
    const keys =
        sortedKeys();
    const categories =
        [
            ...new Set(
                keys
                    .map(
                        key =>
                            data[key].kategori
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(b)
        );


    const vendors =
        [
            ...new Set(
                keys
                    .map(
                        key =>
                            data[key].vendor
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
        );


    renderOptions(
        kodeSelector,
        "-- Select Code --",
        keys
    );


    renderOptions(
        kategoriSelector,
        "-- Select Category --",
        categories
    );


    renderOptions(
        vendorSelector,
        "-- Select Vendor --",
        vendors
    );

}


// ========================================================
// DISPLAY SINGLE ITEM
// ========================================================

function showItem(index) {

    if (
        index < 0 ||
        index >= filteredItems.length
    ) {
        return;
    }

    currentIndex = index;
    const key =
        filteredItems[currentIndex];

    const item =
        data[key];


    if (!item) return;


    itemDetail.style.display =
        "block";


    itemDetail.innerHTML = `

<div class="item-card">

    <div class="item-info">

        <div class="item-row">
            <span class="item-label">
                Vendor :
            </span>
            ${escapeHtml(item.vendor || "-")}
        </div>


        <div class="item-row">
            <span class="item-label">
                Item Code :
            </span>
            ${escapeHtml(key)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Item Name :
            </span>
            ${escapeHtml(item.nama)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Category :
            </span>
            ${escapeHtml(item.kategori)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Sub Category :
            </span>
            ${escapeHtml(item.subkategori)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Color :
            </span>
            ${escapeHtml(item.warna)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Tier :
            </span>
            ${escapeHtml(item.tier)}
        </div>


        <div class="item-row">
            <span class="item-label">
                CBM :
            </span>
            ${escapeHtml(item.cbm)}
        </div>


        <div class="item-row">
            <span class="item-label">
                HTS Code :
            </span>
            ${escapeHtml(item.hts)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Descriptions :
            </span>
            <br>
            ${escapeHtml(item.keterangan)}
        </div>


        <div class="item-delete-area">

            <button
                type="button"
                class="delete-item-button"
                onclick="deleteSelectedItem()"
            >
                🗑️ Delete This Item
            </button>

        </div>

    </div>


    <div class="item-image-box">

        ${
            item.gambar

            ?

            `
            <img
                src="${escapeHtml(item.gambar)}"
                onclick="toggleZoom(this)"
                alt="${escapeHtml(key)}"
            >
            `

            :

            `
            <div class="no-image">
                No Image
            </div>
            `
        }

    </div>

</div>

`;


    previousButton.disabled =
        currentIndex === 0;


    nextButton.disabled =
        currentIndex ===
        filteredItems.length - 1;


    if (deleteItemButton) {

        deleteItemButton.disabled =
            false;

    }

}


// ========================================================
// DISPLAY MULTIPLE
// ========================================================
function renderItemList(keys) {
    itemDetail.innerHTML = "";
    itemDetail.style.display =
        "block";


    if (!keys.length) {

        itemDetail.innerHTML =
            `
            <div class="item-card">
                <strong>
                    No item found.
                </strong>
            </div>
            `;

        return;

    }

    keys.forEach(key => {
        const item =
            data[key];

        const div =
            document.createElement("div");
        div.innerHTML = `

<div
    class="item-card"
    style="margin-bottom:20px;"
>

    <div class="item-info">

        <div class="item-row">
            <span class="item-label">
                Vendor :
            </span>
            ${escapeHtml(item.vendor || "-")}
        </div>


        <div class="item-row">
            <span class="item-label">
                Item Code :
            </span>
            ${escapeHtml(key)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Item Name :
            </span>
            ${escapeHtml(item.nama)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Category :
            </span>
            ${escapeHtml(item.kategori)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Sub Category :
            </span>
            ${escapeHtml(item.subkategori)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Color :
            </span>
            ${escapeHtml(item.warna)}
        </div>


        <div class="item-row">
            <span class="item-label">
                Tier :
            </span>
            ${escapeHtml(item.tier)}
        </div>


        <div class="item-row">
            <span class="item-label">
                CBM :
            </span>
            ${escapeHtml(item.cbm)}
        </div>


        <div class="item-row">
            <span class="item-label">
                HTS Code :
            </span>
            ${escapeHtml(item.hts)}
        </div>

        <div class="item-row">
            <span class="item-label">
                Descriptions :
            </span>
            <br>
            ${escapeHtml(item.keterangan)}
        </div>
    </div>

    <div class="item-image-box">

        ${
            item.gambar

            ?

            `
            <img
                src="${escapeHtml(item.gambar)}"
                onclick="toggleZoom(this)"
                alt="${escapeHtml(key)}"
            >
            `

            :

            `
            <div class="no-image">
                No Image
            </div>
            `
        }
    </div>
</div>

`;

        itemDetail.appendChild(div);

    });

    previousButton.disabled =
        true;

    nextButton.disabled =
        true;


    if (deleteItemButton) {

        deleteItemButton.disabled =
            true;

    }
}


// ========================================================
// NAVIGATION
// ========================================================
previousButton.onclick =
    () => {

        showItem(
            currentIndex - 1
        );
    };

nextButton.onclick =
    () => {

        showItem(
            currentIndex + 1
        );

    };


// ========================================================
// SELECT ITEM CODE
// ========================================================
kodeSelector.onchange =
    function () {
        if (!this.value) {
            resetGallery();
            return;
        }

        currentMode =
            "single";
        filteredItems =
            [this.value];
        currentIndex =
            0;
        kategoriSelector.value =
            "";
        vendorSelector.value =
            "";
        KodeSearch.value =
            "";
        showItem(0);

    };


// ========================================================
// SEARCH
// ========================================================
KodeSearch.oninput =
    function () {
        const term =
            this.value
                .trim()
                .toUpperCase();
        if (!term) {
            resetGallery();
            return;
        }
        filteredItems =
            sortedKeys()
                .filter(
                    k =>
                        k.includes(term)
                );

        if (filteredItems.length) {
            currentMode =
                "search";
            currentIndex =
                0;
            showItem(0);
            kategoriSelector.value =
                "";
            kodeSelector.value =
                "";
            vendorSelector.value =
                "";
        }
        else {
            itemDetail.style.display =
                "block";
            itemDetail.innerHTML = `

<div class="item-card">

    <strong>
        Item code tidak ditemukan:
        ${escapeHtml(term)}
    </strong>

</div>

`;
            previousButton.disabled =
                true;
            nextButton.disabled =
                true;
            if (deleteItemButton) {
                deleteItemButton.disabled =
                    true;
            }
        }
    };

// ========================================================
// SELECT CATEGORY
// ========================================================
kategoriSelector.onchange =
    function () {
        if (!this.value) {
            resetGallery();
            return;
        }
        currentMode =
            "category";
        const keys =
            sortedKeys()
                .filter(
                    k =>
                        data[k].kategori ===
                        this.value
                );

        renderItemList(keys);
        kodeSelector.value =
            "";
        vendorSelector.value =
            "";
        KodeSearch.value =
            "";
    };

// ========================================================
// SELECT VENDOR
// ========================================================
vendorSelector.onchange =
    function () {
        if (!this.value) {
            resetGallery();
            return;
        }

        currentMode =
            "vendor";

        const keys =
            sortedKeys()
                .filter(
                    k =>
                        data[k].vendor ===
                        this.value
                );

        renderItemList(keys);
        kategoriSelector.value =
            "";
        kodeSelector.value =
            "";
        KodeSearch.value =
            "";
    };

// =======================================================
// DELETE SELECTED ITEM
// ========================================================
async function deleteSelectedItem() {
    const code =
        kodeSelector.value ||
        (
            filteredItems.length === 1
                ?
                filteredItems[currentIndex]
                :
                ""
        );


    if (
        !code ||
        !data[code]
    ) {

        alert(
            "Pilih item berdasarkan Select Code terlebih dahulu."
        );

        return;

    }

    const item =
        data[code];

    const confirmed =
        confirm(
            `Hapus item berikut dari Firestore?

${code}
${item.nama || ""}

Data ini akan dihapus permanen.`
        );
    if (!confirmed) return;
    try {

        if (deleteItemButton) {

            deleteItemButton.disabled =
                true;
        }

        setStatus(
            `Deleting ${code}...`,
            "info"
        );

        await db
            .collection(ITEMS_COLLECTION)
            .doc(code)
            .delete();

        delete data[code];
        initDropdowns();
        resetGallery();
        setStatus(
            `Item ${code} berhasil dihapus.`,
            "success"
        );

    }

    catch (error) {
        console.error(error);
        if (deleteItemButton) {

            deleteItemButton.disabled =
                false;
        }

        setStatus(
            `Gagal menghapus ${code}: ${error.message}`,
            "error"
        );

        alert(
            `Gagal menghapus item:
${error.message}`
        );

    }

}


window.deleteSelectedItem =
    deleteSelectedItem;

// ========================================================
// EXCEL IMPORT
// ========================================================
async function uploadExcelToFirestore() {
    const file =
        excelFile?.files?.[0];

    if (!file) {

        alert(
            "Pilih file Excel terlebih dahulu."
        );

        return;

    }

    try {

        uploadExcelButton.disabled =
            true;

        setStatus(
            "Reading Excel file...",
            "info"
        );

        const buffer =
            await file.arrayBuffer();

        const workbook =
            XLSX.read(
                buffer,
                {
                    type: "array"
                }
            );

        const firstSheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];

        const rows =
            XLSX.utils.sheet_to_json(
                firstSheet,
                {
                    defval: ""
                }
            );

        if (!rows.length) {

            throw new Error(
                "Excel tidak memiliki data."
            );

        }

        const items = [];
        const invalidRows = [];
        const seen =
            new Set();

        rows.forEach(
            (row, index) => {

                const code =
                    getExcelCode(row);


                if (!code) {

                    invalidRows.push(
                        index + 2
                    );

                    return;

                }

                if (seen.has(code)) {

                    return;

                }
                seen.add(code);
                items.push({
                    code,
                    item: {
                        ...excelRowToItem(row),
                        kode: code
                    }
                });
            }
        );

        if (!items.length) {

            throw new Error(
                "Tidak ada item valid. Pastikan kolom kode / Item Code tersedia."
            );
        }

        setStatus(
            `Uploading ${items.length.toLocaleString()} items...`,
            "info"
        );

        for (
            let i = 0;
            i < items.length;
            i += 450
        ) {

            const chunk =
                items.slice(
                    i,
                    i + 450
                );


            const batch =
                db.batch();


            chunk.forEach(
                ({ code, item }) => {

                    const ref =
                        db
                            .collection(
                                ITEMS_COLLECTION
                            )
                            .doc(code);


                    batch.set(
                        ref,
                        item,
                        {
                            merge: true
                        }
                    );

                }
            );

            await batch.commit();
            setStatus(
                `Uploaded ${Math.min(
                    i + chunk.length,
                    items.length
                ).toLocaleString()} / ${items.length.toLocaleString()} items...`,
                "info"
            );

        }

        await loadItemsFromFirestore();
        const invalidMessage =
            invalidRows.length

                ?

                ` Baris tanpa kode dilewati: ${
                    invalidRows
                        .slice(0, 20)
                        .join(", ")
                }${
                    invalidRows.length > 20
                        ? "..."
                        : ""
                }.`

                :

                "";

        setStatus(
            `${items.length.toLocaleString()} item berhasil di-upload ke Firestore.${invalidMessage}`,
            "success"
        );

        alert(
            `${items.length.toLocaleString()} item berhasil disimpan ke Firestore.${invalidMessage}`
        );


        excelFile.value =
            "";

    }

    catch (error) {

        console.error(error);


        setStatus(
            `Upload gagal: ${error.message}`,
            "error"
        );


        alert(
            `Upload Excel gagal:
${error.message}`
        );

    }

    finally {

        uploadExcelButton.disabled =
            false;

    }

}


uploadExcelButton?.addEventListener(
    "click",
    uploadExcelToFirestore
);


// ========================================================
// RESET
// ========================================================

function resetGallery() {

    currentMode =
        "menu";

    filteredItems =
        [];

    currentIndex =
        0;

    itemDetail.style.display =
        "none";

    itemDetail.innerHTML =
        "";

    previousButton.disabled =
        true;

    nextButton.disabled =
        true;

    if (deleteItemButton) {

        deleteItemButton.disabled =
            true;

    }

    kodeSelector.value =
        "";

    kategoriSelector.value =
        "";

    vendorSelector.value =
        "";


    KodeSearch.value =
        "";

}

// ========================================================
// NAVIGATION LINKS
// ========================================================
function backToPurchaseOrder() {
    window.location.href =
        "https://jeffanind.github.io/Purchase-Order/";

}

function backToApp1() {
    window.location.href =
        "https://jeffanind.github.io/Appl-System-Dashboard/";

}

window.backToPurchaseOrder =
    backToPurchaseOrder;

window.backToApp1 =
    backToApp1;

// ========================================================
// IMAGE ZOOM
// ========================================================
const modal =
    document.getElementById(
        "imageModal"
    );


const zoomImg =
    document.getElementById(
        "zoomImg"
    );

const closeZoom =
    document.getElementById(
        "closeZoom"
    );

function toggleZoom(img) {

    modal.style.display =
        "flex";

    zoomImg.src =
        img.src;

}

window.toggleZoom =
    toggleZoom;

closeZoom.onclick =
    function () {

        modal.style.display =
            "none";

    };

modal.onclick =
    function () {

        modal.style.display =
            "none";

    };

zoomImg.onclick =
    function () {

        modal.style.display =
            "none";

    };

document.addEventListener(
    "keydown",
    function (e) {

        if (e.key === "Escape") {

            modal.style.display =
                "none";

        }

    }
);

// ========================================================
// START APPLICATION
// ========================================================

(async function startApp() {

    try {
        setStatus(
            "Connecting to Firebase...",
            "info"
        );

        await auth.signInAnonymously();
        await loadItemsFromFirestore();

    }

    catch (error) {
        console.error(error);
        setStatus(
            `Firebase authentication failed: ${error.message}`,
            "error"
        );

        alert(
            "Firebase belum siap. " +
            "Pastikan Anonymous Authentication aktif " +
            "dan firebaseConfig sudah benar."
        );

    }

})();
