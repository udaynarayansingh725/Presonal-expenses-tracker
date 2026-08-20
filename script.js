const api = "/api";

function showMsg(el, text, ok) {
    el.textContent = text;
    el.className = "msg " + (ok ? "success" : "error");
    setTimeout(() => { el.textContent = ""; }, 4000);
}

async function request(url, options) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Something went wrong");
    return data;
}

// ---------- Add Expense ----------
document.getElementById("add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("add-msg");
    const category = document.getElementById("category").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);

    try {
        await request(api + "/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category, amount }),
        });
        showMsg(msg, `Expense added successfully: ${category} = ₹${amount}`, true);
        e.target.reset();
        loadReport();
    } catch (err) {
        showMsg(msg, err.message, false);
    }
});

// ---------- Search Expense ----------
document.getElementById("search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("search-result");
    const category = document.getElementById("search-category").value.trim().toLowerCase();

    if (!category) {
        showMsg(msg, "Please enter a category", false);
        return;
    }

    try {
        const data = await request(api + "/expenses/" + encodeURIComponent(category));
        showMsg(msg, `Found: ${data.category} = ₹${data.amount}`, true);
    } catch (err) {
        showMsg(msg, "Expense category not found!", false);
    }
});

// ---------- Monthly Report ----------
async function loadReport() {
    const report = document.getElementById("report");
    try {
        const data = await request(api + "/report");
        if (data.count === 0) {
            report.innerHTML = "<p class='error'>No expenses found!</p>";
            return;
        }
        let rows = "";
        for (const [cat, amount] of Object.entries(data.expenses)) {
            rows += `<tr><td>${cat}</td><td>₹${amount.toFixed(2)}</td></tr>`;
        }
        report.innerHTML = `
            <table>
                <thead><tr><th>Category</th><th>Amount</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <p class="total">Total Expenses: ₹${data.total.toFixed(2)}</p>`;
    } catch (err) {
        report.innerHTML = "<p class='error'>Failed to load report</p>";
    }
}

document.getElementById("report-btn").addEventListener("click", loadReport);

loadReport();
